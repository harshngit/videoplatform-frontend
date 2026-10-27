// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.
import type { Theme } from "./theme";

export type CaptionStyle = "bar" | "karaoke" | "minimal";

/**
 * Visual style presets. A preset sets the palette and fonts (both overridden by
 * a brand kit), plus things a brand kit doesn't: corner radius, caption style,
 * background treatment and how energetic the motion is.
 */
export type Preset = {
  label: string;
  theme: Theme;
  headingFont: string;
  bodyFont: string;
  radius: number;
  captions: CaptionStyle;
  background: "blobs" | "grid" | "soft" | "plain";
  /** Higher = snappier springs and faster staggers. */
  energy: number;
};

const dark = (bg: [string, string], accent: string, accent2: string, text = "#ffffff"): Theme => ({
  bg, accent, accent2, text, muted: "rgba(255,255,255,0.68)",
  card: "rgba(255,255,255,0.07)", cardBorder: "rgba(255,255,255,0.14)", blobs: [accent, accent2, accent],
});
const light = (bg: [string, string], accent: string, accent2: string, text: string): Theme => ({
  bg, accent, accent2, text, muted: "rgba(17,24,39,0.62)",
  card: "rgba(255,255,255,0.8)", cardBorder: "rgba(17,24,39,0.09)", blobs: [accent, accent2, accent],
});

export const PRESETS: Record<string, Preset> = {
  clean: {
    label: "Clean", theme: light(["#f8fafc", "#e8eef9"], "#2563eb", "#0ea5e9", "#0f172a"),
    headingFont: "Inter", bodyFont: "Inter", radius: 18, captions: "bar", background: "soft", energy: 1,
  },
  bold: {
    label: "Bold", theme: dark(["#0a0a0a", "#1c1917"], "#facc15", "#f43f5e"),
    headingFont: "Montserrat", bodyFont: "Montserrat", radius: 10, captions: "karaoke", background: "plain", energy: 1.6,
  },
  editorial: {
    label: "Editorial", theme: light(["#f5f0e8", "#ece3d3"], "#b45309", "#334155", "#1c1917"),
    headingFont: "Playfair Display", bodyFont: "Lato", radius: 4, captions: "minimal", background: "plain", energy: 0.8,
  },
  playful: {
    label: "Playful", theme: light(["#eef2ff", "#fdf2f8"], "#7c3aed", "#f97316", "#1e1b4b"),
    headingFont: "Nunito", bodyFont: "Nunito", radius: 28, captions: "bar", background: "blobs", energy: 1.3,
  },
  tech: {
    label: "Tech", theme: dark(["#070815", "#141235"], "#8b5cf6", "#22d3ee", "#f5f3ff"),
    headingFont: "Space Grotesk", bodyFont: "Inter", radius: 22, captions: "bar", background: "grid", energy: 1,
  },
  minimal: {
    label: "Minimal", theme: light(["#ffffff", "#f4f4f5"], "#111827", "#6b7280", "#111827"),
    headingFont: "DM Sans", bodyFont: "DM Sans", radius: 0, captions: "minimal", background: "plain", energy: 0.8,
  },
};
