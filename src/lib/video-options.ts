import { BarChart3, Briefcase, Clapperboard, Film, GraduationCap, ImageIcon, Info, Smartphone, UserRound } from "lucide-react";
import type { ElementType } from "react";
import type { Category, ChatSettings, Look, Meta, Style } from "./api";

export const CATEGORIES: { id: Category; label: string; icon: ElementType; text: string; defaults: Partial<ChatSettings> }[] = [
  { id: "educational", label: "Educational", icon: GraduationCap, text: "Teach step by step with examples and a recap.", defaults: { preset: "playful", aspect: "16:9", targetSeconds: 90 } },
  { id: "corporate", label: "Corporate", icon: Briefcase, text: "Polished updates, results and next steps.", defaults: { preset: "clean", aspect: "16:9", targetSeconds: 60 } },
  { id: "informational", label: "Informational", icon: Info, text: "Clear, neutral explainers built on facts.", defaults: { preset: "tech", aspect: "16:9", targetSeconds: 60 } },
  { id: "social", label: "Social Media", icon: Smartphone, text: "Punchy vertical clips with a strong hook.", defaults: { preset: "bold", aspect: "9:16", targetSeconds: 30, captions: true } },
];

export type FormatId = Look | "cinematic" | "avatar";
export const FORMATS: { id: FormatId; label: string; text: string; icon: ElementType; style: Style; look: Look }[] = [
  { id: "text", label: "Motion graphics", text: "Animated text, charts and icons", icon: BarChart3, style: "motion", look: "text" },
  { id: "images", label: "Motion graphics + images", text: "Animated content paired with photos", icon: ImageIcon, style: "motion", look: "images" },
  { id: "visual", label: "Visual video", text: "Full-screen photos and stock footage", icon: Film, style: "motion", look: "visual" },
  { id: "cinematic", label: "Cinematic AI", text: "AI-generated footage, scene by scene", icon: Clapperboard, style: "cinematic", look: "visual" },
  { id: "avatar", label: "Avatar presenter", text: "A lifelike AI presenter speaks your script", icon: UserRound, style: "avatar", look: "text" },
];
export const formatOf = (s: Pick<ChatSettings, "style" | "look">): FormatId =>
  s.style === "cinematic" || s.style === "avatar" ? s.style : s.look ?? "text";

/** Mirrors the renderer's style presets (server/remotion/presets.ts) for the picker. */
export const PRESETS: { id: string; label: string; bg: string; accent: string; accent2: string; text: string; font: string; radius: number }[] = [
  { id: "clean", label: "Clean", bg: "#f8fafc", accent: "#2563eb", accent2: "#0ea5e9", text: "#0f172a", font: "Inter", radius: 8 },
  { id: "bold", label: "Bold", bg: "#0a0a0a", accent: "#facc15", accent2: "#f43f5e", text: "#ffffff", font: "Montserrat", radius: 5 },
  { id: "editorial", label: "Editorial", bg: "#f5f0e8", accent: "#b45309", accent2: "#334155", text: "#1c1917", font: "Playfair Display", radius: 2 },
  { id: "playful", label: "Playful", bg: "#eef2ff", accent: "#7c3aed", accent2: "#f97316", text: "#1e1b4b", font: "Nunito", radius: 12 },
  { id: "tech", label: "Tech", bg: "#0b0a24", accent: "#8b5cf6", accent2: "#22d3ee", text: "#f5f3ff", font: "Space Grotesk", radius: 10 },
  { id: "minimal", label: "Minimal", bg: "#ffffff", accent: "#111827", accent2: "#6b7280", text: "#111827", font: "DM Sans", radius: 0 },
];
export const categoryLabel = (c?: string) => CATEGORIES.find((x) => x.id === c)?.label ?? "Informational";
export const formatLabel = (style: Style, look?: Look) =>
  style === "demo" ? "Product demo" : FORMATS.find((f) => f.id === formatOf({ style, look: look ?? "text" }))?.label ?? "Motion graphics";

/** Pictures in a "motion graphics + images" video (mirrors the server's imagesFor). */
export const imagesFor = (meta: Meta, seconds: number) => Math.max(1, Math.round((seconds / 60) * (meta.images?.perMinute ?? 6)));

/** Credits a video will use: its seconds × the style's rate, plus each AI image for "motion graphics + images". */
export function estimateCredits(meta: Meta, s: Pick<ChatSettings, "style" | "look" | "targetSeconds">) {
  const base = Math.ceil(s.targetSeconds * meta.styles[s.style].multiplier);
  const images = s.style === "motion" && s.look === "images" && meta.images?.charged ? imagesFor(meta, s.targetSeconds) * meta.images.credits : 0;
  return base + images;
}
