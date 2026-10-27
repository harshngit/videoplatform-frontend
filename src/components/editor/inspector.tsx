"use client";
import { useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Copy, ImageIcon, Mic, MicOff, RefreshCw, Trash2, X } from "lucide-react";
import { api, VISUAL_TYPES, type VisualType } from "@/lib/api";
import type { RenderScene, TextOverlay, Transition } from "@/remotion/types";
import { useSession } from "../session";
import { Button, ErrorNote, Input, Label, Select, Textarea } from "../ui";
import { TYPE_LABEL, VisualFields, withDefaults } from "../editors";
import { PRESETS } from "@/lib/video-options";
import { MediaPicker } from "./media-picker";
import { type Doc, type Selection, fmtTime, sceneStarts, totalSec, uid } from "./state";

type Commit = (fn: (d: Doc) => Doc, group?: string) => void;
type Common = { doc: Doc; commit: Commit; projectId: string; voice: string; time: number; onSelect: (s: Selection) => void };

const TRANSITION_LABEL: Record<Transition, string> = { none: "None (cut)", fade: "Fade", slide: "Slide", zoom: "Zoom", wipe: "Wipe" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-line px-4 py-4 last:border-b-0">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h4>
      {children}
    </section>
  );
}

export function Inspector(props: Common & { selection: Selection }) {
  const { selection, doc } = props;
  if (selection?.kind === "scene") {
    const i = doc.scenes.findIndex((s) => s.id === selection.id);
    if (i >= 0) return <SceneInspector {...props} index={i} />;
  }
  if (selection?.kind === "overlay") {
    const o = (doc.overlays ?? []).find((x) => x.id === selection.id);
    if (o) return <OverlayInspector {...props} o={o} />;
  }
  if (selection?.kind === "music" && doc.music) return <MusicInspector {...props} />;
  return <VideoInspector {...props} />;
}

function SceneInspector({ doc, commit, projectId, voice, index, onSelect }: Common & { index: number }) {
  const { meta } = useSession();
  const sc = doc.scenes[index];
  const [picker, setPicker] = useState(false);
  const [voicing, setVoicing] = useState(false);
  const [error, setError] = useState("");
  const [voiceId, setVoiceId] = useState(voice);
  const set = (patch: Partial<RenderScene>, group?: string) =>
    commit((d) => ({ ...d, scenes: d.scenes.map((s, k) => (k === index ? { ...s, ...patch } : s)) }), group);
  const move = (dir: -1 | 1) => commit((d) => {
    const j = index + dir;
    if (j < 0 || j >= d.scenes.length) return d;
    const scenes = [...d.scenes];
    [scenes[index], scenes[j]] = [scenes[j], scenes[index]];
    return { ...d, scenes };
  });

  async function revoice() {
    setVoicing(true);
    setError("");
    try {
      const r = await api<{ audioUrl: string; durationSec: number }>(`/editor/${projectId}/voice`, { method: "POST", json: { text: sc.narration, voice: voiceId } });
      // Scene length follows the new narration, with a short breath at the end.
      set({ audioUrl: r.audioUrl, durationSec: Math.round((r.durationSec + 0.6) * 10) / 10, muted: false });
    } catch (e) { setError((e as Error).message); } finally { setVoicing(false); }
  }

  const media = sc.brollUrl ? { url: sc.brollUrl, video: true } : sc.imageUrl ? { url: sc.imageUrl, video: false } : null;

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="font-semibold">Scene {index + 1}</p>
        <div className="flex gap-0.5">
          <IconBtn label="Move earlier" onClick={() => move(-1)}><ArrowLeft className="size-4" /></IconBtn>
          <IconBtn label="Move later" onClick={() => move(1)}><ArrowRight className="size-4" /></IconBtn>
          <IconBtn label="Duplicate" onClick={() => { const copy = { ...sc, id: uid("s") }; commit((d) => ({ ...d, scenes: [...d.scenes.slice(0, index + 1), copy, ...d.scenes.slice(index + 1)] })); onSelect({ kind: "scene", id: copy.id }); }}><Copy className="size-4" /></IconBtn>
          <IconBtn label="Delete scene" danger onClick={() => { commit((d) => ({ ...d, scenes: d.scenes.filter((_, k) => k !== index) })); onSelect(null); }}><Trash2 className="size-4" /></IconBtn>
        </div>
      </div>

      <Section title="On screen">
        <div>
          <Label>Visual</Label>
          <Select value={sc.visual.type} onChange={(e) => set({ visual: withDefaults(sc.visual, e.target.value as VisualType) })}>
            {VISUAL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </Select>
        </div>
        <VisualFields key={`${sc.id}-${sc.visual.type}`} v={sc.visual} onChange={(visual) => set({ visual }, `visual-${sc.id}`)} />
      </Section>

      <Section title="Narration">
        <Textarea rows={4} value={sc.narration} onChange={(e) => set({ narration: e.target.value }, `narration-${sc.id}`)} placeholder="What the voice says during this scene…" />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="!w-auto flex-1">
            {Object.entries(meta.voices).map(([k, v]) => <option key={k} value={k}>{v.split(" — ")[0]}</option>)}
          </Select>
          <Button size="sm" loading={voicing} disabled={!sc.narration.trim()} onClick={revoice}><RefreshCw className="size-3.5" /> Re-record voice</Button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[#1f0a9e]" checked={!!sc.muted} onChange={(e) => set({ muted: e.target.checked })} />
          {sc.muted ? <MicOff className="size-4 text-muted" /> : <Mic className="size-4 text-muted" />} Mute narration in this scene
        </label>
        {!sc.audioUrl && <p className="text-xs text-amber-700">No voice recorded yet. Write the narration and press Re-record.</p>}
        <ErrorNote>{error}</ErrorNote>
      </Section>

      <Section title="Image or clip">
        {media ? (
          <div className="relative overflow-hidden rounded-xl border border-line bg-black">
            {media.video
              ? <video src={media.url} muted loop autoPlay playsInline className="aspect-video w-full object-cover" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={media.url} alt="" className="aspect-video w-full object-cover" />}
            <button onClick={() => set({ imageUrl: null, brollUrl: null, gallery: undefined })} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove media"><X className="size-4" /></button>
          </div>
        ) : <p className="text-sm text-muted">No image. This scene shows motion graphics only.</p>}
        <Button size="sm" variant="secondary" onClick={() => setPicker(true)}><ImageIcon className="size-4" /> {media ? "Replace" : "Add image or clip"}</Button>
        <div>
          <Label>Layout</Label>
          <Select value={sc.layout ?? "auto"} onChange={(e) => set({ layout: e.target.value as RenderScene["layout"] })}>
            <option value="auto">Same as video</option>
            <option value="text">Motion graphics only</option>
            <option value="images">Graphics beside the image</option>
            <option value="visual">Full-screen image</option>
          </Select>
        </div>
      </Section>

      <Section title="Timing">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label hint="seconds">Length</Label>
            <Input type="number" min={1} max={120} step={0.1} value={sc.durationSec} onChange={(e) => set({ durationSec: Math.max(1, Number(e.target.value) || 1) }, `dur-${sc.id}`)} />
          </div>
          <div>
            <Label>Transition in</Label>
            <Select value={sc.transition ?? ""} onChange={(e) => set({ transition: (e.target.value || undefined) as Transition | undefined })}>
              <option value="">Video default</option>
              {(Object.keys(TRANSITION_LABEL) as Transition[]).map((t) => <option key={t} value={t}>{TRANSITION_LABEL[t]}</option>)}
            </Select>
          </div>
        </div>
      </Section>

      {picker && (
        <MediaPicker projectId={projectId} aspect={doc.aspect} initialQuery={sc.imageQuery ?? sc.visual.heading}
          onClose={() => setPicker(false)}
          onPick={(m) => {
            // In a text-only video, an added image would be invisible, so show it beside the graphics.
            const layout = (!sc.layout || sc.layout === "auto") && (doc.look ?? "text") === "text" ? "images" : sc.layout;
            set(m.kind === "video" ? { brollUrl: m.url, imageUrl: null, layout } : { imageUrl: m.url, brollUrl: null, layout });
            setPicker(false);
          }} />
      )}
    </div>
  );
}

const POSITIONS: [number, number][] = [[12, 12], [50, 12], [88, 12], [12, 50], [50, 50], [88, 50], [12, 88], [50, 88], [88, 88]];

function OverlayInspector({ doc, commit, time, o, onSelect }: Common & { o: TextOverlay }) {
  const set = (patch: Partial<TextOverlay>, group?: string) =>
    commit((d) => ({ ...d, overlays: (d.overlays ?? []).map((x) => (x.id === o.id ? { ...x, ...patch } : x)) }), group);
  const total = totalSec(doc);
  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="font-semibold">Text</p>
        <IconBtn label="Delete text" danger onClick={() => { commit((d) => ({ ...d, overlays: (d.overlays ?? []).filter((x) => x.id !== o.id) })); onSelect(null); }}><Trash2 className="size-4" /></IconBtn>
      </div>
      <Section title="Content">
        <Textarea rows={3} value={o.text} onChange={(e) => set({ text: e.target.value }, `text-${o.id}`)} />
      </Section>
      <Section title="Timing">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label hint={<button className="text-brand" onClick={() => set({ startSec: +Math.min(time, o.endSec - 0.3).toFixed(1) })}>Use playhead</button>}>Start</Label>
            <Input type="number" min={0} max={total} step={0.1} value={o.startSec} onChange={(e) => set({ startSec: Math.max(0, Math.min(o.endSec - 0.3, Number(e.target.value))) }, `ts-${o.id}`)} />
          </div>
          <div>
            <Label hint={<button className="text-brand" onClick={() => set({ endSec: +Math.max(time, o.startSec + 0.3).toFixed(1) })}>Use playhead</button>}>End</Label>
            <Input type="number" min={0} max={total} step={0.1} value={o.endSec} onChange={(e) => set({ endSec: Math.max(o.startSec + 0.3, Math.min(total, Number(e.target.value))) }, `te-${o.id}`)} />
          </div>
        </div>
        <div>
          <Label>Animation</Label>
          <Select value={o.animation} onChange={(e) => set({ animation: e.target.value as TextOverlay["animation"] })}>
            <option value="fade">Fade</option><option value="slide">Slide up</option><option value="pop">Pop</option><option value="none">None</option>
          </Select>
        </div>
      </Section>
      <Section title="Position">
        <div className="grid w-28 grid-cols-3 gap-1">
          {POSITIONS.map(([x, y]) => (
            <button key={`${x}-${y}`} onClick={() => set({ x, y, align: x < 30 ? "left" : x > 70 ? "right" : "center" })} aria-label={`Position ${x}% ${y}%`}
              className={clsx("h-7 rounded border", Math.abs(o.x - x) < 3 && Math.abs(o.y - y) < 3 ? "border-brand bg-brand" : "border-line bg-surface-2 hover:border-brand/40")} />
          ))}
        </div>
        <Slider label="Horizontal" value={o.x} min={0} max={100} onChange={(x) => set({ x }, `x-${o.id}`)} suffix="%" />
        <Slider label="Vertical" value={o.y} min={0} max={100} onChange={(y) => set({ y }, `y-${o.id}`)} suffix="%" />
      </Section>
      <Section title="Style">
        <Slider label="Size" value={o.fontSize} min={16} max={200} onChange={(fontSize) => set({ fontSize }, `fs-${o.id}`)} suffix="px" />
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Weight</Label>
            <Select value={o.weight} onChange={(e) => set({ weight: Number(e.target.value) })}>
              <option value={500}>Regular</option><option value={700}>Bold</option><option value={900}>Black</option>
            </Select>
          </div>
          <div><Label>Align</Label>
            <Select value={o.align} onChange={(e) => set({ align: e.target.value as TextOverlay["align"] })}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">Text <input type="color" value={o.color} onChange={(e) => set({ color: e.target.value }, `c-${o.id}`)} className="size-8 cursor-pointer rounded border-0" /></label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[#1f0a9e]" checked={o.background !== null} onChange={(e) => set({ background: e.target.checked ? "#000000" : null })} /> Background
          </label>
          {o.background !== null && <input type="color" value={o.background} onChange={(e) => set({ background: e.target.value }, `bg-${o.id}`)} className="size-8 cursor-pointer rounded border-0" aria-label="Background colour" />}
        </div>
      </Section>
    </div>
  );
}

function MusicInspector({ doc, commit, onSelect }: Common) {
  const m = doc.music!;
  const set = (patch: Partial<NonNullable<Doc["music"]>>, group?: string) => commit((d) => ({ ...d, music: d.music && { ...d.music, ...patch } }), group);
  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="truncate font-semibold">{m.name}</p>
        <IconBtn label="Remove music" danger onClick={() => { commit((d) => ({ ...d, music: null })); onSelect(null); }}><Trash2 className="size-4" /></IconBtn>
      </div>
      <Section title="Background music">
        <audio src={m.url} controls className="w-full" />
        <Slider label="Volume" value={Math.round(m.volume * 100)} min={0} max={100} onChange={(v) => set({ volume: v / 100 }, "music-vol")} suffix="%" />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[#1f0a9e]" checked={m.duck} onChange={(e) => set({ duck: e.target.checked })} />
          Lower the music while the narrator speaks
        </label>
        <p className="text-xs text-muted">Music loops to fill the whole video.</p>
      </Section>
    </div>
  );
}

function VideoInspector({ doc, commit }: Common) {
  const set = (patch: Partial<Doc>, group?: string) => commit((d) => ({ ...d, ...patch }), group);
  const starts = sceneStarts(doc);
  return (
    <div>
      <div className="px-4 pt-4">
        <p className="font-semibold">Video settings</p>
        <p className="text-xs text-muted">Select a scene, text or music on the timeline to edit it.</p>
      </div>
      <Section title="Size">
        <div className="grid grid-cols-3 gap-2">
          {(["16:9", "9:16", "1:1"] as const).map((a) => (
            <button key={a} onClick={() => set({ aspect: a })} className={clsx("rounded-xl border py-2 text-xs font-medium",
              doc.aspect === a ? "border-brand bg-indigo-50 text-brand" : "border-line hover:border-line-strong")}>
              {a === "16:9" ? "Landscape" : a === "9:16" ? "Vertical" : "Square"}<span className="block text-muted">{a}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title={doc.brand ? "Style (brand kit sets colours & fonts)" : "Style"}>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => set({ preset: p.id })} className={clsx("overflow-hidden rounded-xl border text-left",
              doc.preset === p.id ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-line-strong")}>
              <div className="flex h-9 items-center gap-1 px-2" style={{ background: p.bg }}>
                <span className="h-1.5 w-6" style={{ background: p.accent, borderRadius: p.radius }} /><span className="h-1.5 w-3" style={{ background: p.accent2, borderRadius: p.radius }} />
              </div>
              <span className="block px-2 py-1 text-xs font-medium">{p.label}</span>
            </button>
          ))}
        </div>
        <div>
          <Label>Layout</Label>
          <Select value={doc.look ?? "text"} onChange={(e) => set({ look: e.target.value as Doc["look"] })}>
            <option value="text">Motion graphics</option><option value="images">Motion graphics + images</option><option value="visual">Visual video (full-screen images)</option>
          </Select>
        </div>
      </Section>
      <Section title="Captions">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[#1f0a9e]" checked={doc.captions} onChange={(e) => set({ captions: e.target.checked })} /> Show captions
        </label>
        {doc.captions && (
          <Select value={doc.captionStyle ?? ""} onChange={(e) => set({ captionStyle: (e.target.value || null) as Doc["captionStyle"] })}>
            <option value="">Style default</option><option value="bar">Subtitle bar</option><option value="karaoke">Word by word (social)</option><option value="minimal">Minimal</option>
          </Select>
        )}
      </Section>
      <Section title="Transitions & audio">
        <div>
          <Label>Default transition</Label>
          <Select value={doc.transition ?? "fade"} onChange={(e) => set({ transition: e.target.value as Transition })}>
            {(Object.keys(TRANSITION_LABEL) as Transition[]).map((t) => <option key={t} value={t}>{TRANSITION_LABEL[t]}</option>)}
          </Select>
        </div>
        <Slider label="Narration volume" value={Math.round((doc.narrationVolume ?? 1) * 100)} min={0} max={200} onChange={(v) => set({ narrationVolume: v / 100 }, "narr-vol")} suffix="%" />
      </Section>
      <Section title="Overview">
        <ul className="space-y-1 text-sm text-muted">
          <li>{doc.scenes.length} scenes · {fmtTime(totalSec(doc))}</li>
          <li>{(doc.overlays ?? []).length} text layers{doc.music ? " · music" : ""}</li>
          {doc.scenes.length > 0 && <li>Last scene starts at {fmtTime(starts[starts.length - 1])}</li>}
        </ul>
      </Section>
    </div>
  );
}

function Slider({ label, value, min, max, onChange, suffix }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <Label hint={`${Math.round(value)}${suffix ?? ""}`}>{label}</Label>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#1f0a9e]" />
    </div>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={clsx("rounded-lg p-1.5 text-muted transition hover:bg-surface-2", danger ? "hover:text-red-600" : "hover:text-fg")}>
      {children}
    </button>
  );
}
