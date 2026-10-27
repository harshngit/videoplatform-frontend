// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.
export type Theme = {
  bg: [string, string]; accent: string; accent2: string; text: string; muted: string; card: string; cardBorder: string; blobs: string[];
  /** Corner radius for cards and image frames (set by the style preset). */
  radius?: number;
};

export const THEMES: Record<string, Theme> = {
  midnight: {
    bg: ["#070815", "#141235"], accent: "#8b5cf6", accent2: "#22d3ee", text: "#f5f3ff", muted: "#a5a3c9",
    card: "rgba(255,255,255,0.06)", cardBorder: "rgba(255,255,255,0.12)", blobs: ["#7c3aed", "#0891b2", "#db2777"],
  },
  aurora: {
    bg: ["#03141a", "#06302b"], accent: "#34d399", accent2: "#a3e635", text: "#ecfdf5", muted: "#9ccfc0",
    card: "rgba(255,255,255,0.06)", cardBorder: "rgba(255,255,255,0.12)", blobs: ["#059669", "#0d9488", "#65a30d"],
  },
  paper: {
    bg: ["#faf7f2", "#efe9df"], accent: "#2563eb", accent2: "#f97316", text: "#111827", muted: "#57534e",
    card: "rgba(255,255,255,0.75)", cardBorder: "rgba(17,24,39,0.10)", blobs: ["#bfdbfe", "#fed7aa", "#e9d5ff"],
  },
  sunset: {
    bg: ["#1a0b12", "#3b0f24"], accent: "#fb7185", accent2: "#fbbf24", text: "#fff1f2", muted: "#f0b4c0",
    card: "rgba(255,255,255,0.07)", cardBorder: "rgba(255,255,255,0.14)", blobs: ["#e11d48", "#ea580c", "#9333ea"],
  },
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgba = (hex: string, a: number) => `rgba(${rgb(hex).join(",")},${a})`;
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

/** Builds a video theme from a brand kit's four colours. */
export function brandTheme(b: { primary: string; secondary: string; background: string; text: string }): Theme {
  return {
    bg: [b.background, mix(b.background, b.primary, 0.22)],
    accent: b.primary, accent2: b.secondary, text: b.text, muted: rgba(b.text, 0.68),
    card: rgba(b.text, 0.07), cardBorder: rgba(b.text, 0.14), blobs: [b.primary, b.secondary, mix(b.primary, b.secondary, 0.5)],
  };
}

export const FONT = "'Inter', 'SF Pro Display', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export const formatNumber = (n: number) =>
  Math.abs(n) >= 100 ? Math.round(n).toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
