"use client";
import { useRef, useState } from "react";
import { Film, Search, Sparkles, Upload, X } from "lucide-react";
import { useSession } from "../session";
import { api } from "@/lib/api";
import { Button, ErrorNote, Input, Spinner } from "../ui";

type Result = { token: string; thumb: string; isVideo: boolean };
export type PickedMedia = { kind: "image" | "video"; url: string };

/** Modal for replacing a scene's media: upload your own, or search stock photos and footage. */
export function MediaPicker({ projectId, aspect, initialQuery, onPick, onClose }: {
  projectId: string; aspect: string; initialQuery: string; onPick: (m: PickedMedia) => void; onClose: () => void;
}) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState(initialQuery);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user, meta, refresh } = useSession();
  const canClip = !!meta.providers.video && meta.plans[user.plan].styles.includes("cinematic");
  const clipCredits = 6 * (meta.styles.cinematic?.multiplier ?? 10);

  async function generate(kind: "image" | "video") {
    if (!prompt.trim()) return;
    setBusy(`gen-${kind}`);
    setError("");
    try {
      const m = await api<{ kind: "image" | "video"; url: string }>(`/editor/${projectId}/generate`, { method: "POST", json: { prompt, kind, aspect, seconds: 6 } });
      if (kind === "video") void refresh();
      onPick(m);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  async function search(video: boolean) {
    if (!q.trim()) return;
    setBusy("search");
    setError("");
    try {
      const d = await api<{ results: Result[] }>(`/editor/${projectId}/stock?q=${encodeURIComponent(q)}&aspect=${aspect}${video ? "&video=1" : ""}`);
      setResults(d.results);
      if (!d.results.length) setError("Nothing found. Try simpler words like “office”, “city” or “laptop”.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function choose(r: Result) {
    setBusy(r.token);
    setError("");
    try {
      const m = await api<{ kind: "image" | "video"; url: string }>(`/editor/${projectId}/stock`, { method: "POST", json: { token: r.token, aspect } });
      onPick(m);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  async function uploadFile(f: File) {
    setBusy("upload");
    setError("");
    const fd = new FormData();
    fd.append("file", f);
    fd.append("aspect", aspect);
    try {
      const m = await api<{ kind: "image" | "video" | "audio"; url: string }>(`/editor/${projectId}/upload`, { method: "POST", body: fd });
      if (m.kind === "audio") throw new Error("That's an audio file. Add it as music from the timeline.");
      onPick({ kind: m.kind, url: m.url });
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-950/40 p-4" onClick={onClose}>
      <div className="shadow-card flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-semibold">Choose media</p>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap gap-2">
            <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void search(false); }}>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stock photos…" />
              <Button type="submit" loading={busy === "search"}><Search className="size-4" /> Photos</Button>
              <Button type="button" variant="secondary" onClick={() => search(true)} title="Stock video clips need a Pexels key on the server"><Film className="size-4" /> Clips</Button>
            </form>
            <Button variant="secondary" loading={busy === "upload"} onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Upload</Button>
            <input ref={fileRef} type="file" hidden accept=".png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.m4v"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); e.target.value = ""; }} />
          </div>
          {meta.providers.image && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand"><Sparkles className="size-4" /> Generate with AI</p>
              <div className="flex flex-wrap gap-2">
                <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the image, e.g. “team planning around a whiteboard”" className="min-w-0 flex-1" />
                <Button loading={busy === "gen-image"} disabled={!!busy} onClick={() => generate("image")}>Generate image</Button>
                {canClip && <Button variant="secondary" loading={busy === "gen-video"} disabled={!!busy} onClick={() => generate("video")} title={`6-second AI clip · ${clipCredits} credits`}>AI clip · {clipCredits} cr</Button>}
              </div>
              <p className="mt-1.5 text-xs text-muted">Using {meta.providers.image}{busy === "gen-video" ? " · clips take 1–3 minutes" : ""}</p>
            </div>
          )}
          <ErrorNote>{error}</ErrorNote>
        </div>
        <div className="min-h-40 flex-1 overflow-y-auto px-5 pb-5">
          {busy === "search" ? <div className="grid h-40 place-items-center"><Spinner /></div> : results && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {results.map((r) => (
                <button key={r.token} onClick={() => choose(r)} disabled={!!busy}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-line bg-surface-2 transition hover:ring-2 hover:ring-brand disabled:opacity-60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumb} alt="" className="size-full object-cover" loading="lazy" />
                  {r.isVideo && <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Clip</span>}
                  {busy === r.token && <span className="absolute inset-0 grid place-items-center bg-white/60"><Spinner /></span>}
                </button>
              ))}
            </div>
          )}
          {!results && busy !== "search" && <p className="py-10 text-center text-sm text-muted">Search stock media or upload your own image or clip.</p>}
        </div>
      </div>
    </div>
  );
}
