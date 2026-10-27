"use client";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Player, type PlayerRef } from "@remotion/player";
import {
  ArrowLeftToLine, ArrowRightToLine, ChevronLeft, ClipboardPaste, Copy, CopyPlus, Download, ImageIcon, ImageOff, MicOff, Music,
  Pause, Play, Plus, Redo2, RotateCcw, Sparkles, Trash2, Type, Undo2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Report } from "@/remotion/Report";
import { useSession } from "@/components/session";
import { Button, ErrorNote, Spinner } from "@/components/ui";
import { Timeline } from "@/components/editor/timeline";
import { Inspector } from "@/components/editor/inspector";
import { ContextMenu, type MenuItem, type MenuState } from "@/components/editor/context-menu";
import { MediaPicker } from "@/components/editor/media-picker";
import type { MenuTarget } from "@/components/editor/timeline";
import type { RenderScene, TextOverlay, Transition } from "@/remotion/types";
import { type Doc, type Selection, FPS, newOverlay, newScene, sceneStarts, sizeFor, totalSec, uid, useDocHistory } from "@/components/editor/state";

type Clip = { kind: "scene"; scene: RenderScene } | { kind: "overlay"; overlay: TextOverlay } | null;
const TRANSITIONS: [Transition, string][] = [["fade", "Fade"], ["slide", "Slide"], ["zoom", "Zoom"], ["wipe", "Wipe"], ["none", "Cut"]];
const LAYOUTS: [NonNullable<RenderScene["layout"]>, string][] = [["auto", "Same as video"], ["text", "Motion graphics only"], ["images", "Graphics beside image"], ["visual", "Full-screen image"]];

type EditorProject = {
  id: string; title: string; status: string; progress: number; style: string; voice: string; aspect: string;
  durationSec: number | null; creditsCharged: number; hasDraft: boolean; multiplier: number; error: string | null;
};

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ project: EditorProject; doc: Doc } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ project: EditorProject; doc: Doc }>(`/editor/${id}`).then(setData).catch((e) => setError((e as Error).message));
  }, [id]);
  if (error) return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md space-y-4 text-center"><ErrorNote>{error}</ErrorNote><Button href={`/app/projects/${id}`}>Back to project</Button></div></div>;
  if (!data) return <div className="grid min-h-screen place-items-center"><Spinner className="size-8" /></div>;
  return <Editor key={id} project={data.project} initial={data.doc} />;
}

function Editor({ project: initialProject, initial }: { project: EditorProject; initial: Doc }) {
  const { refresh } = useSession();
  const [project, setProject] = useState(initialProject);
  const { doc, commit, undo, redo, reset, canUndo, canRedo } = useDocHistory(initial);
  const [selection, setSelection] = useState<Selection>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">(initialProject.hasDraft ? "unsaved" : "saved");
  const [exporting, setExporting] = useState<null | { progress: number }>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const player = useRef<PlayerRef>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [clipboard, setClipboard] = useState<Clip>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const first = useRef(true);

  const total = totalSec(doc);
  const durationInFrames = Math.max(FPS, Math.round(doc.scenes.reduce((s, sc) => s + Math.round(sc.durationSec * FPS), 0)));
  const { width, height } = sizeFor(doc.aspect);
  const time = frame / FPS;
  const extraCredits = Math.max(0, Math.ceil(total * project.multiplier) - project.creditsCharged);

  // Autosave the draft shortly after each change.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaveState("unsaved");
    const t = setTimeout(async () => {
      setSaveState("saving");
      try { await api(`/editor/${project.id}`, { method: "PUT", json: { doc } }); setSaveState("saved"); }
      catch { setSaveState("error"); }
    }, 1200);
    return () => clearTimeout(t);
  }, [doc, project.id]);

  // Keep the playhead and play state in sync with the player.
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => { p.removeEventListener("frameupdate", onFrame); p.removeEventListener("play", onPlay); p.removeEventListener("pause", onPause); };
  }, [doc.aspect]);

  const seek = useCallback((sec: number) => { player.current?.seekTo(Math.round(sec * FPS)); setFrame(Math.round(sec * FPS)); }, []);
  const togglePlay = useCallback(() => player.current?.toggle(), []);

  const deleteSelected = useCallback(() => {
    if (!selection) return;
    if (selection.kind === "scene") commit((d) => ({ ...d, scenes: d.scenes.filter((s) => s.id !== selection.id) }));
    else if (selection.kind === "overlay") commit((d) => ({ ...d, overlays: (d.overlays ?? []).filter((o) => o.id !== selection.id) }));
    else commit((d) => ({ ...d, music: null }));
    setSelection(null);
  }, [selection, commit]);

  // --- Scene and text operations shared by menus and shortcuts -------------------
  const patchScene = useCallback((id: string, patch: Partial<RenderScene>) =>
    commit((d) => ({ ...d, scenes: d.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) })), [commit]);
  const patchOverlay = useCallback((id: string, patch: Partial<TextOverlay>) =>
    commit((d) => ({ ...d, overlays: (d.overlays ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o)) })), [commit]);
  const insertSceneAt = useCallback((index: number, sc: RenderScene) => {
    commit((d) => ({ ...d, scenes: [...d.scenes.slice(0, index), sc, ...d.scenes.slice(index)] }));
    setSelection({ kind: "scene", id: sc.id });
  }, [commit]);
  const moveScene = useCallback((id: string, dir: -1 | 1) => commit((d) => {
    const i = d.scenes.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.scenes.length) return d;
    const scenes = [...d.scenes];
    [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
    return { ...d, scenes };
  }), [commit]);
  const addOverlay = useCallback((o: TextOverlay) => {
    commit((d) => ({ ...d, overlays: [...(d.overlays ?? []), o] }));
    setSelection({ kind: "overlay", id: o.id });
  }, [commit]);

  const copySelected = useCallback(() => {
    if (selection?.kind === "scene") { const sc = doc.scenes.find((s) => s.id === selection.id); if (sc) setClipboard({ kind: "scene", scene: sc }); }
    if (selection?.kind === "overlay") { const o = (doc.overlays ?? []).find((x) => x.id === selection.id); if (o) setClipboard({ kind: "overlay", overlay: o }); }
  }, [selection, doc]);
  /** Scenes paste after the selected scene (or at the end); text pastes at `at` (default: the playhead). */
  const paste = useCallback((at?: number) => {
    if (clipboard?.kind === "scene") {
      const i = selection?.kind === "scene" ? doc.scenes.findIndex((s) => s.id === selection.id) + 1 : doc.scenes.length;
      insertSceneAt(i, { ...clipboard.scene, id: uid("s") });
    } else if (clipboard?.kind === "overlay") {
      const len = clipboard.overlay.endSec - clipboard.overlay.startSec;
      const start = Math.max(0, Math.min((at ?? frame / FPS), totalSec(doc) - len));
      addOverlay({ ...clipboard.overlay, id: uid("t"), startSec: +start.toFixed(1), endSec: +(start + len).toFixed(1) });
    }
  }, [clipboard, selection, doc, frame, insertSceneAt, addOverlay]);
  const duplicateSelected = useCallback(() => {
    if (selection?.kind === "scene") {
      const i = doc.scenes.findIndex((s) => s.id === selection.id);
      if (i >= 0) insertSceneAt(i + 1, { ...doc.scenes[i], id: uid("s") });
    } else if (selection?.kind === "overlay") {
      const o = (doc.overlays ?? []).find((x) => x.id === selection.id);
      if (o) addOverlay({ ...o, id: uid("t"), y: Math.min(95, o.y + 8) });
    }
  }, [selection, doc, insertSceneAt, addOverlay]);

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === "c") { copySelected(); }
      else if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); paste(); }
      else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seek(Math.max(0, time - (e.shiftKey ? 5 : 1))); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seek(Math.min(total, time + (e.shiftKey ? 5 : 1))); }
      else if (e.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, undo, redo, deleteSelected, copySelected, paste, duplicateSelected, seek, time, total]);

  // --- Right-click menus ------------------------------------------------------------
  const openMenu = (e: React.MouseEvent, items: MenuItem[]) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, items }); };

  function sceneMenu(id: string): MenuItem[] {
    const i = doc.scenes.findIndex((s) => s.id === id);
    const sc = doc.scenes[i];
    if (!sc) return [];
    const start = sceneStarts(doc)[i];
    return [
      { label: "Play from here", icon: Play, onClick: () => { seek(start); player.current?.play(); } },
      "divider",
      { label: "Duplicate", icon: CopyPlus, shortcut: "⌘D", onClick: () => insertSceneAt(i + 1, { ...sc, id: uid("s") }) },
      { label: "Copy", icon: Copy, shortcut: "⌘C", onClick: () => setClipboard({ kind: "scene", scene: sc }) },
      { label: "Paste after", icon: ClipboardPaste, shortcut: "⌘V", disabled: clipboard?.kind !== "scene",
        onClick: () => clipboard?.kind === "scene" && insertSceneAt(i + 1, { ...clipboard.scene, id: uid("s") }) },
      { label: "Insert new scene before", icon: ArrowLeftToLine, onClick: () => insertSceneAt(i, newScene()) },
      { label: "Insert new scene after", icon: ArrowRightToLine, onClick: () => insertSceneAt(i + 1, newScene()) },
      "divider",
      { label: sc.imageUrl || sc.brollUrl ? "Replace image or clip…" : "Add image or clip…", icon: ImageIcon, onClick: () => setPickerFor(sc.id) },
      { label: "Remove image", icon: ImageOff, disabled: !sc.imageUrl && !sc.brollUrl, onClick: () => patchScene(sc.id, { imageUrl: null, brollUrl: null }) },
      { label: "Mute narration", icon: MicOff, checked: !!sc.muted, onClick: () => patchScene(sc.id, { muted: !sc.muted }) },
      { label: "Layout", children: LAYOUTS.map(([v, l]) => ({ label: l, checked: (sc.layout ?? "auto") === v, onClick: () => patchScene(sc.id, { layout: v }) })) },
      { label: "Transition in", children: [
        { label: "Video default", checked: !sc.transition, onClick: () => patchScene(sc.id, { transition: undefined }) },
        ...TRANSITIONS.map(([v, l]) => ({ label: l, checked: sc.transition === v, onClick: () => patchScene(sc.id, { transition: v }) })),
      ] },
      "divider",
      { label: "Move earlier", disabled: i === 0, onClick: () => moveScene(sc.id, -1) },
      { label: "Move later", disabled: i === doc.scenes.length - 1, onClick: () => moveScene(sc.id, 1) },
      { label: "Delete scene", icon: Trash2, shortcut: "⌫", danger: true, onClick: () => { commit((d) => ({ ...d, scenes: d.scenes.filter((s) => s.id !== sc.id) })); setSelection(null); } },
    ];
  }

  function overlayMenu(id: string): MenuItem[] {
    const list = doc.overlays ?? [];
    const o = list.find((x) => x.id === id);
    if (!o) return [];
    const len = o.endSec - o.startSec;
    return [
      { label: "Duplicate", icon: CopyPlus, shortcut: "⌘D", onClick: () => addOverlay({ ...o, id: uid("t"), y: Math.min(95, o.y + 8) }) },
      { label: "Copy", icon: Copy, shortcut: "⌘C", onClick: () => setClipboard({ kind: "overlay", overlay: o }) },
      { label: "Move to playhead", icon: ArrowRightToLine, onClick: () => { const s0 = Math.max(0, Math.min(time, total - len)); patchOverlay(o.id, { startSec: +s0.toFixed(1), endSec: +(s0 + len).toFixed(1) }); } },
      { label: "Position", children: [
        { label: "Top", onClick: () => patchOverlay(o.id, { x: 50, y: 12, align: "center" }) },
        { label: "Middle", onClick: () => patchOverlay(o.id, { x: 50, y: 50, align: "center" }) },
        { label: "Lower third", onClick: () => patchOverlay(o.id, { x: 6, y: 74, align: "left" }) },
        { label: "Bottom", onClick: () => patchOverlay(o.id, { x: 50, y: 88, align: "center" }) },
      ] },
      { label: "Animation", children: (["fade", "slide", "pop", "none"] as const).map((a) => ({ label: a === "none" ? "None" : a === "slide" ? "Slide up" : a[0].toUpperCase() + a.slice(1), checked: o.animation === a, onClick: () => patchOverlay(o.id, { animation: a }) })) },
      { label: "Bring to front", onClick: () => commit((d) => ({ ...d, overlays: [...(d.overlays ?? []).filter((x) => x.id !== o.id), o] })) },
      { label: "Send to back", onClick: () => commit((d) => ({ ...d, overlays: [o, ...(d.overlays ?? []).filter((x) => x.id !== o.id)] })) },
      "divider",
      { label: "Delete text", icon: Trash2, shortcut: "⌫", danger: true, onClick: () => { commit((d) => ({ ...d, overlays: (d.overlays ?? []).filter((x) => x.id !== o.id) })); setSelection(null); } },
    ];
  }

  function musicMenu(): MenuItem[] {
    const m = doc.music;
    if (!m) return [{ label: "Add music…", icon: Music, onClick: () => musicInput.current?.click() }];
    return [
      { label: "Replace music…", icon: Music, onClick: () => musicInput.current?.click() },
      { label: "Lower while narrator speaks", checked: m.duck, onClick: () => commit((d) => ({ ...d, music: d.music && { ...d.music, duck: !d.music.duck } })) },
      { label: "Volume", children: [10, 25, 50, 75, 100].map((v) => ({ label: `${v}%`, checked: Math.round(m.volume * 100) === v, onClick: () => commit((d) => ({ ...d, music: d.music && { ...d.music, volume: v / 100 } })) })) },
      "divider",
      { label: "Remove music", icon: Trash2, danger: true, onClick: () => { commit((d) => ({ ...d, music: null })); setSelection(null); } },
    ];
  }

  function onTimelineMenu(e: React.MouseEvent, t: MenuTarget) {
    if (t.kind === "scene") return openMenu(e, sceneMenu(t.id));
    if (t.kind === "overlay") return openMenu(e, overlayMenu(t.id));
    if (t.kind === "music") return openMenu(e, musicMenu());
    if (t.track === "scenes") return openMenu(e, [
      { label: "Add scene at end", icon: Plus, onClick: () => insertSceneAt(doc.scenes.length, newScene()) },
      { label: "Paste scene at end", icon: ClipboardPaste, disabled: clipboard?.kind !== "scene", onClick: () => clipboard?.kind === "scene" && insertSceneAt(doc.scenes.length, { ...clipboard.scene, id: uid("s") }) },
    ]);
    if (t.track === "text") return openMenu(e, [
      { label: "Add text here", icon: Type, onClick: () => addOverlay(newOverlay(t.time, total)) },
      { label: "Paste text here", icon: ClipboardPaste, disabled: clipboard?.kind !== "overlay", onClick: () => paste(t.time) },
    ]);
    return openMenu(e, musicMenu());
  }

  /** Right-click on the preview: add text exactly where you clicked. */
  function onPreviewMenu(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 100);
    const y = Math.round(((e.clientY - r.top) / r.height) * 100);
    const starts = sceneStarts(doc);
    const idx = starts.findLastIndex((s0) => s0 <= time);
    const sc = doc.scenes[idx];
    openMenu(e, [
      { label: playing ? "Pause" : "Play", icon: playing ? Pause : Play, shortcut: "Space", onClick: togglePlay },
      { label: "Add text here", icon: Type, onClick: () => addOverlay({ ...newOverlay(time, total), x, y, align: x < 30 ? "left" : x > 70 ? "right" : "center" }) },
      { label: "Paste text here", icon: ClipboardPaste, disabled: clipboard?.kind !== "overlay", onClick: () => clipboard?.kind === "overlay" && addOverlay({ ...clipboard.overlay, id: uid("t"), x, y, startSec: +time.toFixed(1), endSec: +(time + clipboard.overlay.endSec - clipboard.overlay.startSec).toFixed(1) }) },
      "divider",
      ...(sc ? [
        { label: `Edit scene ${idx + 1}`, onClick: () => setSelection({ kind: "scene", id: sc.id }) } as MenuItem,
        { label: sc.imageUrl || sc.brollUrl ? "Replace this scene's image…" : "Add an image to this scene…", icon: ImageIcon, onClick: () => setPickerFor(sc.id) } as MenuItem,
      ] : []),
    ]);
  }

  function addScene() {
    const sc = newScene();
    const at = selection?.kind === "scene" ? doc.scenes.findIndex((s) => s.id === selection.id) + 1 : doc.scenes.length;
    commit((d) => ({ ...d, scenes: [...d.scenes.slice(0, at), sc, ...d.scenes.slice(at)] }));
    setSelection({ kind: "scene", id: sc.id });
  }
  function addText() {
    const o = newOverlay(time, total);
    commit((d) => ({ ...d, overlays: [...(d.overlays ?? []), o] }));
    setSelection({ kind: "overlay", id: o.id });
  }
  async function uploadMusic(f: File) {
    setError("");
    setNotice("Uploading music…");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const m = await api<{ kind: string; url: string; name: string }>(`/editor/${project.id}/upload`, { method: "POST", body: fd });
      if (m.kind !== "audio") throw new Error("Choose an audio file (MP3, WAV, M4A).");
      commit((d) => ({ ...d, music: { url: m.url, name: m.name, volume: 0.25, duck: true } }));
      setSelection({ kind: "music" });
      setNotice("");
    } catch (e) { setError((e as Error).message); setNotice(""); }
  }

  async function discard() {
    if (!confirm("Discard all unexported changes and go back to the last exported video?")) return;
    await api(`/editor/${project.id}/draft`, { method: "DELETE" });
    const d = await api<{ project: EditorProject; doc: Doc }>(`/editor/${project.id}`);
    first.current = true;
    reset(d.doc);
    setProject(d.project);
    setSaveState("saved");
    setSelection(null);
  }

  async function exportVideo() {
    setError("");
    try {
      await api(`/editor/${project.id}/export`, { method: "POST", json: { doc } });
      setExporting({ progress: 70 });
      player.current?.pause();
      // Poll until the render finishes.
      for (;;) {
        await new Promise((r) => setTimeout(r, 2500));
        const d = await api<{ project: EditorProject; doc: Doc }>(`/editor/${project.id}`);
        setExporting({ progress: d.project.progress });
        if (!["queued", "rendering", "composing"].includes(d.project.status)) {
          setProject(d.project);
          if (d.project.hasDraft) { setError("The export didn't finish. Your edits are saved; check the project's activity log and try again."); }
          else { setNotice("Exported! Your edited video is ready."); first.current = true; reset(d.doc); setSaveState("saved"); }
          break;
        }
      }
      void refresh();
    } catch (e) { setError((e as Error).message); } finally { setExporting(null); }
  }

  const inputProps = useMemo(() => doc as unknown as Record<string, unknown>, [doc]);
  const playerSize = useMemo(() => (doc.aspect === "9:16" ? { maxWidth: 360 } : doc.aspect === "1:1" ? { maxWidth: 560 } : { maxWidth: 960 }), [doc.aspect]);

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* top bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-2.5">
        <Link href={`/app/projects/${project.id}`} className="flex items-center gap-1 text-sm text-muted hover:text-fg"><ChevronLeft className="size-4" /> Project</Link>
        <div className="h-5 w-px bg-line" />
        <p className="min-w-0 max-w-[30ch] truncate font-semibold">{project.title}</p>
        <span className="text-xs text-muted">{saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved changes" : saveState === "error" ? "Couldn't save" : "All changes saved"}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30" title="Undo (⌘Z)" aria-label="Undo"><Undo2 className="size-4" /></button>
          <button onClick={redo} disabled={!canRedo} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30" title="Redo (⇧⌘Z)" aria-label="Redo"><Redo2 className="size-4" /></button>
          {(project.hasDraft || saveState !== "saved") && <Button variant="ghost" size="sm" onClick={discard}><RotateCcw className="size-3.5" /> Discard edits</Button>}
          <Button variant="secondary" size="sm" href={`/api/projects/${project.id}/video?download=1`}><Download className="size-3.5" /> Last export</Button>
          <Button size="sm" loading={!!exporting} onClick={exportVideo} title={extraCredits ? `Adds ${extraCredits} credits for the extra length` : "Free: no longer than what you paid for"}>
            <Sparkles className="size-3.5" /> Export{extraCredits ? ` · ${extraCredits} credits` : ""}
          </Button>
        </div>
      </header>

      {(error || notice) && (
        <div className="border-b border-line bg-white px-4 py-2">
          {error ? <ErrorNote>{error}</ErrorNote> : <p className="text-sm text-emerald-700">{notice} {notice.startsWith("Exported") && <Link className="font-medium underline" href={`/app/projects/${project.id}`}>View it</Link>}</p>}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* preview */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-4 sm:p-6">
          <div className="w-full overflow-hidden rounded-xl bg-black shadow-xl" style={playerSize} onContextMenu={onPreviewMenu}>
            <Player
              ref={player}
              component={Report as unknown as React.ComponentType<Record<string, unknown>>}
              inputProps={inputProps}
              durationInFrames={durationInFrames}
              fps={FPS}
              compositionWidth={width}
              compositionHeight={height}
              style={{ width: "100%", aspectRatio: `${width} / ${height}` }}
              clickToPlay
              doubleClickToFullscreen
              spaceKeyToPlayOrPause={false}
              numberOfSharedAudioTags={8}
            />
          </div>
          <p className="text-xs text-muted">Right-click anything for options · Space play · ⌘C/⌘V copy & paste · ⌘D duplicate · ⌘Z undo · Delete removes</p>
        </div>

        {/* inspector */}
        <aside className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-line bg-white md:block">
          <Inspector doc={doc} commit={commit} projectId={project.id} voice={project.voice} time={time} selection={selection} onSelect={setSelection} />
        </aside>
      </div>

      {/* timeline */}
      <div className="h-[220px] shrink-0">
        <Timeline doc={doc} time={time} playing={playing} selection={selection} onSeek={seek} onTogglePlay={togglePlay}
          onSelect={setSelection} onCommit={commit} onAddScene={addScene} onAddText={addText} onAddMusic={() => musicInput.current?.click()} onMenu={onTimelineMenu} />
      </div>
      <input ref={musicInput} type="file" hidden accept=".mp3,.wav,.m4a,.aac,.ogg" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadMusic(f); e.target.value = ""; }} />

      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
      {pickerFor && (() => {
        const sc = doc.scenes.find((s) => s.id === pickerFor);
        if (!sc) return null;
        return (
          <MediaPicker projectId={project.id} aspect={doc.aspect} initialQuery={sc.imageQuery ?? sc.visual.heading} onClose={() => setPickerFor(null)}
            onPick={(m) => {
              // In a text-only video, an added image would be invisible, so show it beside the graphics.
              const layout = (!sc.layout || sc.layout === "auto") && (doc.look ?? "text") === "text" ? "images" : sc.layout;
              patchScene(sc.id, m.kind === "video" ? { brollUrl: m.url, imageUrl: null, layout } : { imageUrl: m.url, brollUrl: null, layout });
              setPickerFor(null);
            }} />
        );
      })()}
      {exporting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-950/40">
          <div className="shadow-card w-80 rounded-2xl bg-white p-6 text-center">
            <p className="font-semibold">Exporting your video…</p>
            <p className="mt-1 text-sm text-muted">This takes about as long as the video. You can keep this tab open.</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-brand transition-all" style={{ width: `${exporting.progress}%` }} /></div>
            <p className="mt-2 text-xs text-muted">{exporting.progress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
