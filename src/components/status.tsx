import { Badge } from "./ui";
import type { Status } from "@/lib/api";

export const PIPELINE = [
  { key: "ingest", label: "Read document", detail: "Extract text from your file" },
  { key: "script", label: "Write script", detail: "Claude drafts the voiceover" },
  { key: "storyboard", label: "Storyboard", detail: "Scenes and on-screen visuals" },
  { key: "voice", label: "Voiceover", detail: "Studio-quality narration" },
  { key: "visuals", label: "Visuals", detail: "Animation, presenter, B-roll" },
  { key: "compose", label: "Final video", detail: "Render and deliver MP4" },
] as const;

/** Which pipeline step (0–5) a status belongs to; 6 = finished. */
export function stepOf(status: Status): number {
  switch (status) {
    case "uploaded": case "queued": case "ingesting": return 0;
    case "scripting": case "script_review": return 1;
    case "storyboarding": case "storyboard_review": return 2;
    case "voicing": return 3;
    case "rendering": return 4;
    case "composing": return 5;
    case "done": return 6;
    default: return -1;
  }
}

export const isWorking = (s: Status) => !["script_review", "storyboard_review", "done", "failed"].includes(s);

const LABELS: Record<Status, string> = {
  uploaded: "Queued", queued: "Queued", ingesting: "Reading", scripting: "Writing script", script_review: "Review script",
  storyboarding: "Storyboarding", storyboard_review: "Review storyboard", voicing: "Recording voice",
  rendering: "Rendering", composing: "Finishing", done: "Ready", failed: "Failed",
};

export function StatusBadge({ status }: { status: Status }) {
  const tone = status === "done" ? "success" : status === "failed" ? "danger" : status.endsWith("review") ? "warn" : "brand";
  return (
    <Badge tone={tone}>
      {isWorking(status) && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {LABELS[status] ?? status}
    </Badge>
  );
}
