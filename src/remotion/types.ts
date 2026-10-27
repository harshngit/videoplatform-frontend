// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.
import { z } from "zod";

export const ScriptSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    narration: z.string(),
  })),
});
export type Script = z.infer<typeof ScriptSchema>;

export const VISUAL_TYPES = ["title", "bullets", "stat", "bar_chart", "quote", "timeline", "comparison", "closing"] as const;

export const VisualSchema = z.object({
  type: z.enum(VISUAL_TYPES),
  heading: z.string(),
  subheading: z.string().nullable(),
  bullets: z.array(z.string()).nullable(),
  stat: z.object({ value: z.number(), prefix: z.string(), suffix: z.string(), label: z.string() }).nullable(),
  chart: z.object({ labels: z.array(z.string()), values: z.array(z.number()), unit: z.string() }).nullable(),
  quote: z.object({ text: z.string(), author: z.string() }).nullable(),
  items: z.array(z.object({ label: z.string(), detail: z.string() })).nullable(),
  comparison: z.object({
    leftTitle: z.string(), left: z.array(z.string()),
    rightTitle: z.string(), right: z.array(z.string()),
  }).nullable(),
});
export type Visual = z.infer<typeof VisualSchema>;

/** Product demo: which part of the uploaded recording a scene shows, and where it zooms. */
export const DemoShotSchema = z.object({
  start: z.number(), // seconds into the recording
  end: z.number(),
  focusX: z.number(), // 0–1 across the recording; the zoom and callout centre here
  focusY: z.number(),
  zoom: z.number(), // 1 = whole screen, up to ~2.2
  callout: z.string().nullable(), // short label pinned at the focus point
});
export type DemoShot = z.infer<typeof DemoShotSchema>;

// What the storyboard writer fills in for each scene.
export const WriterSceneSchema = z.object({
  id: z.string(),
  narration: z.string(),
  visual: VisualSchema,
  // Optional prompt for an AI-generated B-roll clip (hybrid / cinematic styles)
  brollPrompt: z.string().nullable(),
  // 2–4 word stock-photo search for image-based formats
  imageQuery: z.string().nullable(),
});
export const WriterStoryboardSchema = z.object({ scenes: z.array(WriterSceneSchema) });

export const SceneSchema = WriterSceneSchema.extend({ demo: DemoShotSchema.nullable().optional() });
export type Scene = z.infer<typeof SceneSchema>;

export const StoryboardSchema = z.object({ scenes: z.array(SceneSchema) });
export type Storyboard = z.infer<typeof StoryboardSchema>;

/** Parses a stored or edited storyboard, filling fields added after it was saved. */
export function parseStoryboard(raw: unknown): Storyboard {
  const r = raw as { scenes?: Record<string, unknown>[] };
  return StoryboardSchema.parse({ scenes: (r?.scenes ?? []).map((s) => ({ imageQuery: null, brollPrompt: null, ...s })) });
}

export const TRANSITIONS = ["none", "fade", "slide", "zoom", "wipe"] as const;
export type Transition = (typeof TRANSITIONS)[number];

// What the renderer receives once voice + media have been produced.
export type RenderScene = Scene & {
  durationSec: number;
  audioUrl: string | null;
  brollUrl: string | null;
  avatarUrl: string | null;
  imageUrl: string | null;
  // More pictures shown one after another after imageUrl ("motion graphics + images" scenes)
  gallery?: string[];
  // Editor overrides (all optional; defaults come from the video-level settings)
  transition?: Transition;
  layout?: "auto" | "text" | "images" | "visual";
  muted?: boolean;
};

/** Free text placed on top of the video for a time range (editor). Positions are % of the frame. */
export type TextOverlay = {
  id: string; text: string; startSec: number; endSec: number;
  x: number; y: number; fontSize: number; color: string; background: string | null;
  weight: number; align: "left" | "center" | "right"; animation: "none" | "fade" | "slide" | "pop";
};

export type MusicTrack = { url: string; name: string; volume: number; duck: boolean };

export const CATEGORIES = ["educational", "corporate", "informational", "social"] as const;
export type Category = (typeof CATEGORIES)[number];
/** text = motion graphics only; images = motion graphics with photos; visual = full-screen photos/footage. */
export const LOOKS = ["text", "images", "visual"] as const;
export type Look = (typeof LOOKS)[number];

export type RenderBrand = {
  primary: string; secondary: string; background: string; text: string;
  headingFont: string; bodyFont: string;
  logoUrl: string | null; logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  watermarkUrl: string | null; watermarkText: string | null; watermarkOpacity: number;
};

/** The product recording a demo is built from (transcoded to H.264). */
export type DemoSource = { src: string; duration: number; width: number; height: number; product: string };

export type RenderProps = {
  title: string;
  theme: string;
  aspect: "16:9" | "9:16" | "1:1";
  captions: boolean;
  watermark: boolean;
  style: string;
  scenes: RenderScene[];
  brand: RenderBrand | null;
  look?: Look;
  category?: Category;
  preset?: string | null;
  // Editor additions
  overlays?: TextOverlay[];
  music?: MusicTrack | null;
  narrationVolume?: number;
  captionStyle?: "bar" | "karaoke" | "minimal" | null;
  transition?: Transition;
  demo?: DemoSource | null;
};
