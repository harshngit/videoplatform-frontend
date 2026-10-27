export type User = { id: string; email: string; name: string; plan: PlanId; creditsSeconds: number };
export type PlanId = "free" | "basic" | "pro" | "cinematic";
export type Style = "motion" | "avatar" | "hybrid" | "cinematic" | "voiceover" | "demo";
export type Category = "educational" | "corporate" | "informational" | "social";
/** text = motion graphics only; images = motion graphics with photos; visual = full-screen photos/footage. */
export type Look = "text" | "images" | "visual";

export type Plan = {
  name: string; priceMonthly: number; monthlySeconds: number; styles: Style[];
  maxVideoSeconds: number; watermark: boolean; features: string[];
};
export type Meta = {
  plans: Record<PlanId, Plan>;
  styles: Record<Style, { name: string; tagline: string; minPlan: PlanId; multiplier: number }>;
  voices: Record<string, string>;
  themes: string[];
  fonts: string[];
  integrations: Record<"claude" | "elevenlabs" | "macSay" | "neuralVoice" | "pexels" | "heygen" | "veo" | "fal" | "openai" | "gemini" | "stripe", boolean>;
  /** Active AI generators (null when none is configured). */
  providers: { image: string | null; video: string | null };
  /** "Motion graphics + images": pictures per minute and the price of each AI one (charged only when `charged`). */
  images: { perMinute: number; priceUsd: number; credits: number; charged: boolean };
};

export type Script = { title: string; summary: string; sections: { heading: string; narration: string }[] };
export const VISUAL_TYPES = ["title", "bullets", "stat", "bar_chart", "quote", "timeline", "comparison", "closing"] as const;
export type VisualType = (typeof VISUAL_TYPES)[number];
export type Visual = {
  type: VisualType; heading: string; subheading: string | null; bullets: string[] | null;
  stat: { value: number; prefix: string; suffix: string; label: string } | null;
  chart: { labels: string[]; values: number[]; unit: string } | null;
  quote: { text: string; author: string } | null;
  items: { label: string; detail: string }[] | null;
  comparison: { leftTitle: string; left: string[]; rightTitle: string; right: string[] } | null;
};
export type Scene = { id: string; narration: string; visual: Visual; brollPrompt: string | null };
export type Storyboard = { scenes: Scene[] };

export type Status =
  | "uploaded" | "queued" | "ingesting" | "scripting" | "script_review" | "storyboarding" | "storyboard_review"
  | "voicing" | "rendering" | "composing" | "done" | "failed";

export type ProjectSummary = {
  id: string; title: string; mode: "direct" | "guided"; style: Style; theme: string; aspect: string; voice: string;
  targetSeconds: number; captions: boolean; status: Status; progress: number; docName: string | null;
  durationSec: number | null; creditsCharged: number; error: string | null; createdAt: string; updatedAt: string;
  hasVideo: boolean; hasThumb: boolean;
  category?: Category; look?: Look; preset?: string | null;
};
export type ProjectDetail = ProjectSummary & {
  script: Script | null; storyboard: Storyboard | null; docPreview: string | null;
  brand: { name: string; primary: string; secondary: string; background: string; text: string; headingFont: string; logoUrl: string | null } | null;
  estimate: { seconds: number; credits: number };
};
export type ProjectEvent = { id: string; level: "info" | "warn" | "error"; message: string; createdAt: string };
export type LedgerRow = { id: string; deltaSeconds: number; reason: string; createdAt: string };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export const fmtSeconds = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m}m ${r.toString().padStart(2, "0")}s` : `${r}s`;
};
export const fmtMinutes = (s: number) => `${Math.floor(s / 60)} min`;

export type ChatMode = "direct" | "script" | "chat";
export type ChatSettings = {
  style: Style; aspect: "16:9" | "9:16" | "1:1"; voice: string; targetSeconds: number;
  captions: boolean; brandKitId: string | null; theme: string;
  category: Category; look: Look; preset: string;
};
export const DEFAULT_SETTINGS: ChatSettings = {
  style: "motion", aspect: "16:9", voice: "ava", targetSeconds: 60, captions: true, brandKitId: null, theme: "midnight",
  category: "informational", look: "images", preset: "tech",
};
export type ChatSummary = { id: string; title: string; mode: ChatMode; updatedAt: string };
export type ChatMessage = {
  id: string; role: "user" | "assistant"; kind: "text" | "project" | "error"; content: string;
  attachmentName: string | null; projectId: string | null; createdAt: string;
};
export type ChatProject = Pick<ProjectSummary, "id" | "title" | "status" | "progress" | "style" | "aspect" | "mode" | "durationSec" | "error" | "updatedAt" | "hasVideo" | "hasThumb" | "category" | "look">;
export type ChatDetail = { id: string; title: string; mode: ChatMode; settings: ChatSettings };

export type BrandKit = {
  id: string; name: string; isDefault: boolean;
  primaryColor: string; secondaryColor: string; backgroundColor: string; textColor: string;
  headingFont: string; bodyFont: string;
  logoUrl: string | null; logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  watermarkUrl: string | null; watermarkText: string | null; watermarkOpacity: number;
};

/** Notifies the sidebar that the chat list changed. */
export const CHATS_CHANGED = "rr:chats-changed";
