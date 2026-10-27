"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CloudUpload, FileVideo, ImagePlus, MonitorPlay, ScrollText, Sparkles, X } from "lucide-react";
import { api, DEFAULT_SETTINGS, fmtSeconds, type BrandKit, type ChatProject, type ChatSettings, type ProjectSummary } from "@/lib/api";
import { useSession } from "@/components/session";
import { Button, ErrorNote, Input, Label, Textarea } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
import { SettingsFields } from "@/components/studio";
import { isWorking } from "@/components/status";

const MAX_REFS = 4;
const MAX_MB = 500;
const RUNS_KEY = "rr:runs:demo";
const VIDEO_ACCEPT = ".mp4,.mov,.webm,.m4v,.mkv";
const REF_ACCEPT = ".png,.jpg,.jpeg,.webp,.mp4,.mov,.webm";

const readRuns = (): string[] => { try { return JSON.parse(sessionStorage.getItem(RUNS_KEY) ?? "[]"); } catch { return []; } };
const writeRuns = (ids: string[]) => { try { sessionStorage.setItem(RUNS_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ } };
const sizeLabel = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
const nameFrom = (f: File) => f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b([a-z])/g, (m) => m.toUpperCase()).slice(0, 60);

/** Uploads with progress (large recordings take a while). */
function upload(fd: FormData, onProgress: (p: number) => void) {
  return new Promise<{ project: ProjectSummary }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/projects/demo");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let body: { error?: string; project?: ProjectSummary } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.project) resolve({ project: body.project });
      else reject(new Error(body.error ?? (xhr.status === 413 ? `The file is too large (max ${MAX_MB} MB).` : `Upload failed (${xhr.status})`)));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(fd);
  });
}

export default function ProductDemo() {
  const { user, meta, refresh } = useSession();
  const plan = meta.plans[user.plan];
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoSec, setVideoSec] = useState<number | null>(null);
  const [product, setProduct] = useState("");
  const [notes, setNotes] = useState("");
  const [refs, setRefs] = useState<File[]>([]);
  const [review, setReview] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({ ...DEFAULT_SETTINGS, style: "demo", look: "text", preset: "auto", targetSeconds: 60 });
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState<string[]>([]);
  const [projects, setProjects] = useState<Record<string, ChatProject>>({});
  const videoRef = useRef<HTMLInputElement>(null);
  const refsRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api<{ kits: BrandKit[] }>("/brand").then((d) => setKits(d.kits)).catch(() => {}); setRuns(readRuns()); }, []);

  const load = useCallback(async () => {
    const found = await Promise.all(runs.map((id) => api<{ project: ProjectSummary }>(`/projects/${id}`).then((d) => d.project, () => null)));
    setProjects(Object.fromEntries(found.flatMap((p) => (p ? [[p.id, p as ChatProject]] : []))));
  }, [runs]);
  useEffect(() => { if (runs.length) void load(); }, [runs, load]);
  const working = Object.values(projects).some((p) => isWorking(p.status));
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => { void load(); }, 2500);
    return () => clearInterval(t);
  }, [working, load]);
  const wasWorking = useRef(false);
  useEffect(() => { if (wasWorking.current && !working) void refresh(); wasWorking.current = working; }, [working, refresh]);

  useEffect(() => {
    if (!video) { setVideoUrl(null); setVideoSec(null); return; }
    const url = URL.createObjectURL(video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  function pickVideo(f: File | undefined) {
    if (!f) return;
    if (!/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name)) { setError("Choose a video file: MP4, MOV or WebM."); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`That file is ${sizeLabel(f.size)}; the limit is ${MAX_MB} MB.`); return; }
    setError("");
    setVideo(f);
    if (!product) setProduct(nameFrom(f));
  }

  const credits = Math.ceil(settings.targetSeconds * (meta.styles.demo?.multiplier ?? 2));

  async function create() {
    if (!video) { setError("Upload a screen recording of your product."); return; }
    if (!product.trim()) { setError("Give your product a name."); return; }
    setError("");
    const fd = new FormData();
    const fields: Record<string, string> = {
      title: product.trim(), text: notes, mode: review ? "guided" : "direct", aspect: settings.aspect, voice: settings.voice,
      targetSeconds: String(settings.targetSeconds), captions: String(settings.captions),
    };
    if (settings.preset !== "auto") fields.preset = settings.preset;
    if (settings.brandKitId) fields.brandKitId = settings.brandKitId;
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    fd.append("video", video);
    refs.forEach((r) => fd.append("references", r));
    setProgress(0);
    try {
      const { project } = await upload(fd, setProgress);
      const next = [project.id, ...runs];
      setRuns(next);
      writeRuns(next);
      setProjects((p) => ({ ...p, [project.id]: project as ChatProject }));
      setVideo(null);
      setRefs([]);
      setNotes("");
      setProduct("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-5">
        <div className="shadow-card rounded-2xl bg-white p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="bg-brand-gradient grid size-11 shrink-0 place-items-center rounded-xl"><MonitorPlay className="size-5 text-white" /></div>
            <div>
              <h2 className="text-xl font-semibold sm:text-2xl">Turn a product recording into a designed demo</h2>
              <p className="text-sm text-muted">Upload a screen recording. We frame it, zoom into each feature, add callouts, headings and a voiceover.</p>
            </div>
          </div>

          {video && videoUrl ? (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center">
              <video src={videoUrl} muted playsInline preload="metadata" onLoadedMetadata={(e) => setVideoSec(e.currentTarget.duration)}
                className="aspect-video w-full shrink-0 rounded-xl bg-black object-contain sm:w-56" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{video.name}</p>
                <p className="text-sm text-muted">{sizeLabel(video.size)}{videoSec ? ` · ${fmtSeconds(videoSec)} recording` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => videoRef.current?.click()}>Replace</Button>
                <Button size="sm" variant="ghost" onClick={() => setVideo(null)} aria-label="Remove recording"><X className="size-4" /></Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => videoRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pickVideo(e.dataTransfer.files[0]); }}
              className={clsx("group mt-6 flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
                drag ? "border-brand bg-indigo-50" : "border-line-strong hover:border-brand/40 hover:bg-surface-2")}
            >
              <CloudUpload className="size-20 text-[#6b6b6b] transition group-hover:scale-105 group-hover:text-brand" strokeWidth={1.5} />
              <p className="mt-3 text-lg font-semibold text-fg">Drop your product video here</p>
              <p className="mt-1 text-sm text-muted">or <span className="font-medium text-brand">click to browse</span> · MP4, MOV or WebM up to {MAX_MB} MB, 15 min</p>
            </button>
          )}

          <div className="mt-6 grid gap-4">
            <div>
              <Label>Product name</Label>
              <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Acme Analytics" maxLength={120} />
            </div>
            <div>
              <Label hint="Optional">What should viewers learn?</Label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={20000}
                placeholder="Key features to highlight, who it's for, and the call to action. e.g. Show how teams build a dashboard in 2 minutes; end with 'Start your free trial at acme.com'." />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-surface-2/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">References <span className="font-normal text-muted">(optional)</span></p>
                <p className="text-xs text-muted">Images or videos of a demo style you like. We match their mood, pacing and look. Up to {MAX_REFS}.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => refsRef.current?.click()} disabled={refs.length >= MAX_REFS}><ImagePlus className="size-4" /> Add reference</Button>
            </div>
            {refs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {refs.map((r, i) => (
                  <div key={i} className="group relative size-20 overflow-hidden rounded-xl border border-line bg-white">
                    {r.type.startsWith("image/")
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={URL.createObjectURL(r)} alt={r.name} className="size-full object-cover" />
                      : <div className="grid size-full place-items-center text-brand"><FileVideo className="size-7" /><span className="sr-only">{r.name}</span></div>}
                    <button onClick={() => setRefs(refs.filter((_, k) => k !== i))} aria-label={`Remove ${r.name}`}
                      className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
            <input type="checkbox" className="mt-0.5 size-4 accent-[#1f0a9e]" checked={review} onChange={(e) => setReview(e.target.checked)} />
            <span>
              <span className="block text-sm font-semibold">Review the script first</span>
              <span className="block text-xs text-muted">Edit the voiceover and scenes before anything renders. Otherwise we make the whole demo straight away.</span>
            </span>
          </label>

          {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
          {progress !== null && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="bg-brand-gradient h-full transition-all" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-muted">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : "Upload complete, starting…"}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button size="lg" loading={progress !== null} disabled={!video} onClick={create}>
              {review ? <><ScrollText className="size-5" /> Write my demo script</> : <><Sparkles className="size-5" /> Create product demo</>}
            </Button>
            <p className="text-sm text-muted">{settings.aspect} · ≈ {fmtSeconds(settings.targetSeconds)} · ≈ {credits.toLocaleString()} credits{review && " · charged only after you approve"}</p>
          </div>
        </div>

        {runs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Your demos</h3>
              <Link href="/app/media" className="text-sm font-medium text-brand hover:underline">See all in My Media</Link>
            </div>
            {runs.map((id) => projects[id] && <ProjectCard key={id} p={projects[id]} onChanged={load} />)}
          </div>
        )}
      </div>

      <div className="shadow-card h-fit rounded-2xl bg-white p-5 xl:sticky xl:top-6">
        <p className="mb-4 font-semibold">Demo settings</p>
        <SettingsFields demo settings={settings} kits={kits} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} maxSeconds={Math.min(plan.maxVideoSeconds, 300)} />
      </div>
      <input ref={videoRef} type="file" hidden accept={VIDEO_ACCEPT} onChange={(e) => { pickVideo(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={refsRef} type="file" hidden multiple accept={REF_ACCEPT}
        onChange={(e) => { const add = Array.from(e.target.files ?? []); setRefs((cur) => [...cur, ...add].slice(0, MAX_REFS)); e.target.value = ""; }} />
    </div>
  );
}
