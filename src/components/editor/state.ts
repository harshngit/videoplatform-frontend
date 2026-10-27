"use client";
import { useCallback, useRef, useState } from "react";
import type { RenderProps, RenderScene, TextOverlay } from "@/remotion/types";

export const FPS = 30;
export type Doc = RenderProps;
export type Selection = { kind: "scene"; id: string } | { kind: "overlay"; id: string } | { kind: "music" } | null;

export const totalSec = (d: Doc) => d.scenes.reduce((s, sc) => s + sc.durationSec, 0);
export const sizeFor = (aspect: Doc["aspect"]) =>
  aspect === "9:16" ? { width: 1080, height: 1920 } : aspect === "1:1" ? { width: 1080, height: 1080 } : { width: 1920, height: 1080 };

/** Start time (s) of each scene, in order. */
export function sceneStarts(d: Doc) {
  const out: number[] = [];
  let t = 0;
  for (const sc of d.scenes) { out.push(t); t += sc.durationSec; }
  return out;
}

export const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newScene(): RenderScene {
  return {
    id: uid("s"), narration: "", brollPrompt: null, imageQuery: null, durationSec: 4,
    audioUrl: null, brollUrl: null, avatarUrl: null, imageUrl: null,
    visual: { type: "bullets", heading: "New scene", subheading: null, bullets: ["Your point here"], stat: null, chart: null, quote: null, items: null, comparison: null },
  };
}

export function newOverlay(at: number, total: number): TextOverlay {
  const start = Math.min(at, Math.max(0, total - 1));
  return {
    id: uid("t"), text: "Your text", startSec: +start.toFixed(2), endSec: +Math.min(total, start + 3).toFixed(2),
    x: 50, y: 18, fontSize: 64, color: "#ffffff", background: "#000000", weight: 800, align: "center", animation: "pop",
  };
}

const HISTORY = 80;

/**
 * Document state with undo/redo. Rapid edits sharing a `group` key (typing,
 * dragging a slider) collapse into one undo step.
 */
export function useDocHistory(initial: Doc) {
  const [state, setState] = useState({ past: [] as Doc[], present: initial, future: [] as Doc[] });
  const lastGroup = useRef<{ key: string; at: number } | null>(null);

  const commit = useCallback((next: Doc | ((d: Doc) => Doc), group?: string) => {
    setState((s) => {
      const value = typeof next === "function" ? next(s.present) : next;
      if (value === s.present) return s;
      const now = Date.now();
      const merge = group && lastGroup.current?.key === group && now - lastGroup.current.at < 1200;
      lastGroup.current = group ? { key: group, at: now } : null;
      if (merge) return { ...s, present: value, future: [] };
      return { past: [...s.past, s.present].slice(-HISTORY), present: value, future: [] };
    });
  }, []);

  const undo = useCallback(() => setState((s) => (s.past.length
    ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s)), []);
  const redo = useCallback(() => setState((s) => (s.future.length
    ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)), []);
  const reset = useCallback((d: Doc) => setState({ past: [], present: d, future: [] }), []);

  return { doc: state.present, commit, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
};
