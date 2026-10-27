"use client";
import { useRef, useState } from "react";
import clsx from "clsx";
import { Music, Pause, Play, Plus, Type, ZoomIn, ZoomOut, Film, MicOff } from "lucide-react";
import type { RenderScene, TextOverlay } from "@/remotion/types";
import { type Doc, type Selection, fmtTime, sceneStarts, totalSec } from "./state";

const TYPE_COLOR: Record<string, string> = {
  title: "bg-indigo-500", closing: "bg-indigo-500", bullets: "bg-violet-500", stat: "bg-fuchsia-500",
  bar_chart: "bg-sky-500", quote: "bg-amber-500", timeline: "bg-emerald-500", comparison: "bg-teal-500",
};

export type MenuTarget =
  | { kind: "scene"; id: string } | { kind: "overlay"; id: string } | { kind: "music" }
  | { kind: "track"; track: "scenes" | "text" | "music"; time: number };

type Props = {
  doc: Doc; time: number; playing: boolean; selection: Selection;
  onSeek: (sec: number) => void; onTogglePlay: () => void; onSelect: (s: Selection) => void;
  onCommit: (fn: (d: Doc) => Doc, group?: string) => void;
  onAddScene: () => void; onAddText: () => void; onAddMusic: () => void;
  onMenu: (e: React.MouseEvent, target: MenuTarget) => void;
};

/** Drag helper: calls onMove with the horizontal delta in seconds until the pointer is released. */
function useDrag(pps: number) {
  return (e: React.PointerEvent, onMove: (dSec: number) => void) => {
    if (e.button !== 0) return; // right-click opens the menu instead
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const move = (ev: PointerEvent) => onMove((ev.clientX - x0) / pps);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
}

export function Timeline({ doc, time, playing, selection, onSeek, onTogglePlay, onSelect, onCommit, onAddScene, onAddText, onAddMusic, onMenu }: Props) {
  const [pps, setPps] = useState(36); // pixels per second
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useDrag(pps);
  const total = totalSec(doc);
  const starts = sceneStarts(doc);
  const width = Math.max(total * pps + 120, 600);
  const LABEL = 92;

  const timeAt = (e: React.MouseEvent) => {
    const el = scroller.current!;
    const x = e.clientX - el.getBoundingClientRect().left + el.scrollLeft - LABEL;
    return Math.max(0, Math.min(total, x / pps));
  };
  const seekFromEvent = (e: React.MouseEvent) => onSeek(timeAt(e));
  const trackMenu = (track: "scenes" | "text" | "music") => (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    onMenu(e, { kind: "track", track, time: timeAt(e) });
  };

  const resizeScene = (e: React.PointerEvent, i: number) => {
    const d0 = doc.scenes[i].durationSec;
    drag(e, (ds) => onCommit((d) => ({
      ...d, scenes: d.scenes.map((s, k) => (k === i ? { ...s, durationSec: Math.max(1, Math.round((d0 + ds) * 10) / 10) } : s)),
    }), `resize-${doc.scenes[i].id}`));
  };

  const moveOverlay = (e: React.PointerEvent, o: TextOverlay, mode: "move" | "start" | "end") => {
    onSelect({ kind: "overlay", id: o.id });
    const { startSec: s0, endSec: e0 } = o;
    drag(e, (ds) => onCommit((d) => ({
      ...d,
      overlays: (d.overlays ?? []).map((x) => {
        if (x.id !== o.id) return x;
        const r = (v: number) => Math.round(v * 10) / 10;
        if (mode === "move") { const len = e0 - s0; const s = Math.max(0, Math.min(total - len, s0 + ds)); return { ...x, startSec: r(s), endSec: r(s + len) }; }
        if (mode === "start") return { ...x, startSec: r(Math.max(0, Math.min(e0 - 0.3, s0 + ds))) };
        return { ...x, endSec: r(Math.max(s0 + 0.3, Math.min(total, e0 + ds))) };
      }),
    }), `overlay-${o.id}`));
  };

  const dropScene = (to: number) => {
    if (dragIndex === null || dragIndex === to) return;
    onCommit((d) => {
      const scenes = [...d.scenes];
      const [moved] = scenes.splice(dragIndex, 1);
      scenes.splice(to, 0, moved);
      return { ...d, scenes };
    });
    setDragIndex(null);
  };

  const tick = pps >= 60 ? 1 : pps >= 25 ? 2 : 5;

  return (
    <div className="flex h-full flex-col border-t border-line bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <button onClick={onTogglePlay} className="grid size-9 place-items-center rounded-lg bg-brand text-white hover:bg-brand-hover" aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
        </button>
        <span className="w-28 font-mono text-xs text-muted">{fmtTime(time)} / {fmtTime(total)}</span>
        <div className="mx-1 h-6 w-px bg-line" />
        <ToolButton icon={Plus} label="Scene" onClick={onAddScene} />
        <ToolButton icon={Type} label="Text" onClick={onAddText} />
        <ToolButton icon={Music} label={doc.music ? "Replace music" : "Music"} onClick={onAddMusic} />
        <div className="ml-auto flex items-center gap-2 text-muted">
          <ZoomOut className="size-4" />
          <input type="range" min={10} max={120} value={pps} onChange={(e) => setPps(Number(e.target.value))} className="w-28 accent-[#1f0a9e]" aria-label="Timeline zoom" />
          <ZoomIn className="size-4" />
        </div>
      </div>

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative" style={{ width: width + LABEL }}>
          {/* ruler */}
          <div className="sticky top-0 z-10 flex h-6 cursor-pointer border-b border-line bg-surface-2/80" onClick={seekFromEvent}>
            <div className="sticky left-0 z-10 shrink-0 bg-surface-2" style={{ width: LABEL }} />
            <div className="relative flex-1">
              {Array.from({ length: Math.ceil(total / tick) + 1 }).map((_, i) => (
                <div key={i} className="absolute top-0 h-full border-l border-line-strong pl-1 text-[10px] text-muted" style={{ left: i * tick * pps }}>{fmtTime(i * tick).replace(/\.0$/, "")}</div>
              ))}
            </div>
          </div>

          <Track label="Scenes" icon={Film} labelWidth={LABEL} onEmptyClick={seekFromEvent} onEmptyMenu={trackMenu("scenes")}>
            {doc.scenes.map((sc, i) => (
              <SceneBlock key={sc.id} sc={sc} left={starts[i] * pps} width={sc.durationSec * pps} index={i}
                selected={selection?.kind === "scene" && selection.id === sc.id}
                onSelect={() => { onSelect({ kind: "scene", id: sc.id }); onSeek(starts[i] + 0.01); }}
                onResize={(e) => resizeScene(e, i)}
                onDragStart={() => setDragIndex(i)} onDrop={() => dropScene(i)} dragging={dragIndex === i}
                onMenu={(e) => { e.preventDefault(); onSelect({ kind: "scene", id: sc.id }); onMenu(e, { kind: "scene", id: sc.id }); }} />
            ))}
          </Track>

          <Track label="Text" icon={Type} labelWidth={LABEL} onEmptyClick={seekFromEvent} onEmptyMenu={trackMenu("text")}>
            {(doc.overlays ?? []).map((o) => (
              <div key={o.id} onPointerDown={(e) => { if (e.button === 0) moveOverlay(e, o, "move"); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onSelect({ kind: "overlay", id: o.id }); onMenu(e, { kind: "overlay", id: o.id }); }}
                className={clsx("absolute top-1.5 bottom-1.5 flex cursor-grab items-center overflow-hidden rounded-md bg-amber-400/90 px-2 text-xs font-medium text-amber-950 active:cursor-grabbing",
                  selection?.kind === "overlay" && selection.id === o.id && "ring-2 ring-brand ring-offset-1")}
                style={{ left: o.startSec * pps, width: Math.max(8, (o.endSec - o.startSec) * pps) }}>
                <span onPointerDown={(e) => moveOverlay(e, o, "start")} className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-amber-600/40" />
                <span className="truncate">{o.text || "Text"}</span>
                <span onPointerDown={(e) => moveOverlay(e, o, "end")} className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-amber-600/40" />
              </div>
            ))}
          </Track>

          <Track label="Music" icon={Music} labelWidth={LABEL} onEmptyClick={seekFromEvent} onEmptyMenu={trackMenu("music")}>
            {doc.music && (
              <button onClick={() => onSelect({ kind: "music" })}
                onContextMenu={(e) => { e.preventDefault(); onSelect({ kind: "music" }); onMenu(e, { kind: "music" }); }}
                className={clsx("absolute top-1.5 bottom-1.5 left-0 flex items-center gap-1.5 overflow-hidden rounded-md bg-emerald-500/90 px-2 text-xs font-medium text-white",
                  selection?.kind === "music" && "ring-2 ring-brand ring-offset-1")}
                style={{ width: total * pps }}>
                <Music className="size-3.5 shrink-0" /><span className="truncate">{doc.music.name} · {Math.round(doc.music.volume * 100)}%{doc.music.duck ? " · ducked" : ""}</span>
              </button>
            )}
          </Track>

          {/* playhead */}
          <div className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-red-500" style={{ left: LABEL + time * pps }}>
            <div className="absolute -left-1.5 -top-0.5 size-3.5 rounded-full bg-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium hover:border-brand/40 hover:bg-surface-2">
      <Icon className="size-3.5 text-brand" />{label}
    </button>
  );
}

function Track({ label, icon: Icon, labelWidth, children, onEmptyClick, onEmptyMenu }: { label: string; icon: React.ElementType; labelWidth: number; children: React.ReactNode; onEmptyClick: (e: React.MouseEvent) => void; onEmptyMenu: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex h-14 border-b border-line">
      <div className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-line bg-white px-3 text-xs font-medium text-muted" style={{ width: labelWidth }}>
        <Icon className="size-3.5" />{label}
      </div>
      <div className="relative flex-1" onClick={(e) => { if (e.target === e.currentTarget) onEmptyClick(e); }} onContextMenu={onEmptyMenu}>{children}</div>
    </div>
  );
}

function SceneBlock({ sc, left, width, index, selected, onSelect, onResize, onDragStart, onDrop, dragging, onMenu }: {
  sc: RenderScene; left: number; width: number; index: number; selected: boolean; dragging: boolean;
  onSelect: () => void; onResize: (e: React.PointerEvent) => void; onDragStart: () => void; onDrop: () => void;
  onMenu: (e: React.MouseEvent) => void;
}) {
  const media = sc.imageUrl;
  return (
    <div draggable onDragStart={onDragStart} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={onSelect} onContextMenu={onMenu}
      className={clsx("group absolute top-1.5 bottom-1.5 cursor-pointer overflow-hidden rounded-md text-white", TYPE_COLOR[sc.visual.type] ?? "bg-violet-500",
        selected && "ring-2 ring-brand ring-offset-1", dragging && "opacity-40")}
      style={{ left: left + 1, width: Math.max(10, width - 2) }} title={`${index + 1}. ${sc.visual.heading}`}>
      {media && <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${media})` }} />}
      <div className="relative flex h-full items-center gap-1 px-2 text-xs font-medium">
        <span className="opacity-70">{index + 1}</span>
        <span className="truncate">{sc.visual.heading || sc.visual.type}</span>
        {sc.muted && <MicOff className="size-3 shrink-0 opacity-80" />}
        {sc.brollUrl && <Film className="size-3 shrink-0 opacity-80" />}
      </div>
      <span onPointerDown={onResize} onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-black/20 opacity-0 transition group-hover:opacity-100" title="Drag to change length" />
    </div>
  );
}
