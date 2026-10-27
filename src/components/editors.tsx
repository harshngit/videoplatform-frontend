"use client";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { VISUAL_TYPES, fmtSeconds, type ProjectDetail, type Scene, type Script, type Visual, type VisualType } from "@/lib/api";

type PreviewBrand = ProjectDetail["brand"];
import { Card, Input, Label, Select, Textarea } from "./ui";

const wordsToSec = (t: string) => Math.max(3, t.split(/\s+/).filter(Boolean).length / 2.5);
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function move<T>(arr: T[], i: number, d: -1 | 1) {
  const a = [...arr];
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}

function RowTools({ onUp, onDown, onDelete }: { onUp: () => void; onDown: () => void; onDelete: () => void }) {
  const b = "rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg";
  return (
    <div className="flex items-center gap-0.5">
      <button className={b} onClick={onUp} aria-label="Move up"><ArrowUp className="size-4" /></button>
      <button className={b} onClick={onDown} aria-label="Move down"><ArrowDown className="size-4" /></button>
      <button className={clsx(b, "hover:text-red-600")} onClick={onDelete} aria-label="Delete"><Trash2 className="size-4" /></button>
    </div>
  );
}

export function ScriptEditor({ script, onChange }: { script: Script; onChange: (s: Script) => void }) {
  const words = script.sections.reduce((n, s) => n + s.narration.split(/\s+/).filter(Boolean).length, 0);
  const setSection = (i: number, patch: Partial<Script["sections"][number]>) =>
    onChange({ ...script, sections: script.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div><Label>Title</Label><Input value={script.title} onChange={(e) => onChange({ ...script, title: e.target.value })} /></div>
          <div className="flex items-end gap-6 text-sm">
            <div><p className="text-muted">Words</p><p className="font-semibold">{words}</p></div>
            <div><p className="text-muted">Runtime</p><p className="font-semibold">≈ {fmtSeconds((words / 150) * 60)}</p></div>
          </div>
        </div>
      </Card>
      {script.sections.map((s, i) => (
        <Card key={i} className="p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs font-semibold">{i + 1}</span>
            <Input value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} className="font-medium" />
            <RowTools
              onUp={() => onChange({ ...script, sections: move(script.sections, i, -1) })}
              onDown={() => onChange({ ...script, sections: move(script.sections, i, 1) })}
              onDelete={() => onChange({ ...script, sections: script.sections.filter((_, k) => k !== i) })}
            />
          </div>
          <Textarea rows={Math.max(3, Math.ceil(s.narration.length / 95))} value={s.narration} onChange={(e) => setSection(i, { narration: e.target.value })} />
          <p className="mt-1.5 text-right text-xs text-muted">≈ {fmtSeconds(wordsToSec(s.narration))}</p>
        </Card>
      ))}
      <button onClick={() => onChange({ ...script, sections: [...script.sections, { heading: "New section", narration: "" }] })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong py-4 text-sm text-muted transition hover:border-brand/40 hover:text-fg">
        <Plus className="size-4" /> Add section
      </button>
    </div>
  );
}

export const TYPE_LABEL: Record<VisualType, string> = {
  title: "Title card", bullets: "Bullet points", stat: "Big number", bar_chart: "Bar chart",
  quote: "Quote", timeline: "Timeline", comparison: "Comparison", closing: "Closing card",
};

export function withDefaults(v: Visual, type: VisualType): Visual {
  const n: Visual = { ...v, type };
  if (type === "bullets" && !n.bullets) n.bullets = ["First point", "Second point"];
  if (type === "stat" && !n.stat) n.stat = { value: 100, prefix: "", suffix: "%", label: "What this number means" };
  if (type === "bar_chart" && !n.chart) n.chart = { labels: ["A", "B", "C"], values: [3, 5, 2], unit: "" };
  if (type === "quote" && !n.quote) n.quote = { text: "A memorable line from the document.", author: "" };
  if (type === "timeline" && !n.items) n.items = [{ label: "Step 1", detail: "" }, { label: "Step 2", detail: "" }];
  if (type === "comparison" && !n.comparison) n.comparison = { leftTitle: "Before", left: ["…"], rightTitle: "After", right: ["…"] };
  return n;
}

export function StoryboardEditor({ scenes, onChange, theme, aspect, brand }: { scenes: Scene[]; onChange: (s: Scene[]) => void; theme: string; aspect: string; brand?: PreviewBrand }) {
  const set = (i: number, sc: Scene) => onChange(scenes.map((s, k) => (k === i ? sc : s)));
  return (
    <div className="space-y-4">
      {scenes.map((sc, i) => (
        <Card key={sc.id + i} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="grid size-7 place-items-center rounded-lg bg-surface-2 text-xs font-semibold">{i + 1}</span>
              <span className="font-medium">Scene {i + 1}</span>
              <span className="text-muted">· ≈ {fmtSeconds(wordsToSec(sc.narration))}</span>
            </div>
            <RowTools onUp={() => onChange(move(scenes, i, -1))} onDown={() => onChange(move(scenes, i, 1))} onDelete={() => onChange(scenes.filter((_, k) => k !== i))} />
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-[260px_1fr]">
            <div className="space-y-3">
              <ScenePreview visual={sc.visual} theme={theme} aspect={aspect} brand={brand} />
              <div>
                <Label>Visual</Label>
                <Select value={sc.visual.type} onChange={(e) => set(i, { ...sc, visual: withDefaults(sc.visual, e.target.value as VisualType) })}>
                  {VISUAL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div><Label>Narration</Label><Textarea rows={4} value={sc.narration} onChange={(e) => set(i, { ...sc, narration: e.target.value })} /></div>
              <VisualFields v={sc.visual} onChange={(visual) => set(i, { ...sc, visual })} />
              <div>
                <Label hint="Hybrid & cinematic styles">B-roll prompt</Label>
                <Input value={sc.brollPrompt ?? ""} placeholder="e.g. Slow aerial shot over a busy port at sunrise" onChange={(e) => set(i, { ...sc, brollPrompt: e.target.value || null })} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function VisualFields({ v, onChange }: { v: Visual; onChange: (v: Visual) => void }) {
  const head = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label>On-screen heading</Label><Input value={v.heading} onChange={(e) => onChange({ ...v, heading: e.target.value })} /></div>
      <div><Label>Subheading</Label><Input value={v.subheading ?? ""} onChange={(e) => onChange({ ...v, subheading: e.target.value || null })} /></div>
    </div>
  );
  switch (v.type) {
    case "bullets":
      return <>{head}<div><Label hint="One per line">Bullets</Label><Textarea rows={4} defaultValue={(v.bullets ?? []).join("\n")} onBlur={(e) => onChange({ ...v, bullets: lines(e.target.value) })} /></div></>;
    case "stat": {
      const s = v.stat!;
      const set = (p: Partial<typeof s>) => onChange({ ...v, stat: { ...s, ...p } });
      return (
        <>{head}
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Prefix</Label><Input value={s.prefix} onChange={(e) => set({ prefix: e.target.value })} placeholder="$" /></div>
            <div><Label>Value</Label><Input type="number" value={s.value} onChange={(e) => set({ value: Number(e.target.value) })} /></div>
            <div><Label>Suffix</Label><Input value={s.suffix} onChange={(e) => set({ suffix: e.target.value })} placeholder="%" /></div>
          </div>
          <div><Label>Label</Label><Input value={s.label} onChange={(e) => set({ label: e.target.value })} /></div>
        </>
      );
    }
    case "bar_chart": {
      const c = v.chart!;
      return (
        <>{head}
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div>
              <Label hint="Label: value, one per line">Data</Label>
              <Textarea rows={4} defaultValue={c.labels.map((l, i) => `${l}: ${c.values[i] ?? 0}`).join("\n")}
                onBlur={(e) => {
                  const rows = lines(e.target.value).map((l) => { const m = l.match(/^(.*?)[:=]\s*(-?[\d.,]+)/); return m ? [m[1].trim(), parseFloat(m[2].replace(/,/g, ""))] as const : null; }).filter(Boolean) as (readonly [string, number])[];
                  onChange({ ...v, chart: { ...c, labels: rows.map((r) => r[0]), values: rows.map((r) => r[1]) } });
                }} />
            </div>
            <div><Label>Unit</Label><Input value={c.unit} onChange={(e) => onChange({ ...v, chart: { ...c, unit: e.target.value } })} placeholder="M, %" /></div>
          </div>
        </>
      );
    }
    case "quote": {
      const q = v.quote!;
      return (
        <>
          <div><Label>Quote</Label><Textarea rows={3} value={q.text} onChange={(e) => onChange({ ...v, quote: { ...q, text: e.target.value } })} /></div>
          <div><Label>Attribution</Label><Input value={q.author} onChange={(e) => onChange({ ...v, quote: { ...q, author: e.target.value } })} /></div>
        </>
      );
    }
    case "timeline":
      return <>{head}<div><Label hint="Label — detail, one per line">Steps</Label>
        <Textarea rows={4} defaultValue={(v.items ?? []).map((it) => `${it.label} — ${it.detail}`).join("\n")}
          onBlur={(e) => onChange({ ...v, items: lines(e.target.value).map((l) => { const [label, ...rest] = l.split(/\s+[—-]\s+/); return { label, detail: rest.join(" — ") }; }) })} /></div></>;
    case "comparison": {
      const c = v.comparison!;
      return (
        <>{head}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Input value={c.leftTitle} onChange={(e) => onChange({ ...v, comparison: { ...c, leftTitle: e.target.value } })} />
              <Textarea rows={3} defaultValue={c.left.join("\n")} onBlur={(e) => onChange({ ...v, comparison: { ...c, left: lines(e.target.value) } })} /></div>
            <div className="space-y-2"><Input value={c.rightTitle} onChange={(e) => onChange({ ...v, comparison: { ...c, rightTitle: e.target.value } })} />
              <Textarea rows={3} defaultValue={c.right.join("\n")} onBlur={(e) => onChange({ ...v, comparison: { ...c, right: lines(e.target.value) } })} /></div>
          </div>
        </>
      );
    }
    default:
      return head;
  }
}

const PREVIEW_BG: Record<string, string> = {
  midnight: "from-[#070815] to-[#1e1a4a]", aurora: "from-[#03141a] to-[#0a4038]", paper: "from-[#faf7f2] to-[#e7dfd2] text-gray-900", sunset: "from-[#1a0b12] to-[#4a1430]",
};

export function ScenePreview({ visual: v, theme, aspect = "16:9", brand }: { visual: Visual; theme: string; aspect?: string; brand?: PreviewBrand }) {
  const shape = aspect === "9:16" ? "mx-auto aspect-[9/16] max-h-64" : aspect === "1:1" ? "mx-auto aspect-square max-h-56" : "aspect-video";
  return (
    <div className={clsx("relative flex flex-col", shape, "justify-center overflow-hidden rounded-xl border border-line bg-gradient-to-br p-3", brand ? "" : PREVIEW_BG[theme] ?? PREVIEW_BG.midnight)}
      style={brand ? { background: `linear-gradient(135deg, ${brand.background}, ${brand.background} 50%, ${brand.primary}40)`, color: brand.text } : undefined}>
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-violet-500/30 blur-2xl" />
      {v.type === "stat" && v.stat ? (
        <>
          <p className="text-[8px] font-bold uppercase tracking-widest text-cyan-300">{v.heading}</p>
          <p className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-2xl font-black text-transparent">{v.stat.prefix}{v.stat.value.toLocaleString()}{v.stat.suffix}</p>
          <p className="line-clamp-2 text-[9px] font-medium">{v.stat.label}</p>
        </>
      ) : v.type === "bar_chart" && v.chart ? (
        <>
          <p className="truncate text-[10px] font-bold">{v.heading}</p>
          <div className="mt-2 flex h-14 items-end gap-1.5">
            {v.chart.values.map((x, i) => {
              const max = Math.max(...v.chart!.values.map(Math.abs), 1);
              return <div key={i} className={clsx("flex-1 rounded-sm", x === max ? "bg-gradient-to-t from-violet-500 to-cyan-400" : "bg-white/25")} style={{ height: `${(Math.abs(x) / max) * 100}%` }} />;
            })}
          </div>
        </>
      ) : v.type === "quote" && v.quote ? (
        <p className="line-clamp-4 text-[10px] font-semibold"><span className="text-violet-400">“</span>{v.quote.text}</p>
      ) : (
        <>
          <p className={clsx("font-bold leading-tight", v.type === "title" || v.type === "closing" ? "text-sm" : "text-[10px]", v.type === "closing" && "text-center")}>{v.heading}</p>
          {v.subheading && <p className="mt-1 line-clamp-2 text-[8px] opacity-70">{v.subheading}</p>}
          {v.type === "bullets" && <ul className="mt-1.5 space-y-0.5">{(v.bullets ?? []).slice(0, 4).map((b, i) => <li key={i} className="truncate rounded bg-white/10 px-1.5 py-0.5 text-[8px]">{b}</li>)}</ul>}
          {v.type === "timeline" && <div className="mt-2 flex gap-1">{(v.items ?? []).map((it, i) => <div key={i} className="flex-1 truncate border-t-2 border-violet-400 pt-1 text-[7px]">{it.label}</div>)}</div>}
          {v.type === "comparison" && v.comparison && <div className="mt-1.5 grid grid-cols-2 gap-1 text-[8px]"><div className="rounded bg-white/10 p-1">{v.comparison.leftTitle}</div><div className="rounded bg-white/10 p-1">{v.comparison.rightTitle}</div></div>}
        </>
      )}
      <span className="absolute bottom-1.5 right-2 text-[8px] uppercase tracking-wider opacity-50">{v.type.replace("_", " ")}</span>
    </div>
  );
}
