"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, Check, ChevronLeft, Download, Scissors, FileText, RefreshCw, Sparkles, Trash2, Wand2 } from "lucide-react";
import { api, fmtSeconds, type ProjectDetail, type ProjectEvent, type Scene, type Script } from "@/lib/api";
import { useSession } from "@/components/session";
import { Badge, Button, Card, ErrorNote, Spinner } from "@/components/ui";
import { PIPELINE, StatusBadge, isWorking, stepOf } from "@/components/status";
import { ScenePreview, ScriptEditor, StoryboardEditor } from "@/components/editors";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { refresh: refreshUser } = useSession();
  const [p, setP] = useState<ProjectDetail | null>(null);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const lastStatus = useRef<string>("");

  const load = useCallback(async () => {
    const data = await api<{ project: ProjectDetail; events: ProjectEvent[] }>(`/projects/${id}`);
    setP(data.project);
    setEvents(data.events);
    // Only reset local edits when the server moves to a new stage.
    if (data.project.status !== lastStatus.current) {
      lastStatus.current = data.project.status;
      setScript(data.project.script);
      setScenes(data.project.storyboard?.scenes ?? null);
      setDirty(false);
      // Credits move when rendering is reserved, settled or refunded.
      void refreshUser();
    }
    return data.project;
  }, [id, refreshUser]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let alive = true;
    const tick = async () => {
      try {
        const proj = await load();
        if (alive && isWorking(proj.status)) t = setTimeout(tick, 2000);
      } catch { if (alive) setError("Couldn't load this project."); }
    };
    void tick();
    return () => { alive = false; clearTimeout(t); };
  }, [load, p?.status]);

  async function act(name: string, fn: () => Promise<unknown>) {
    setBusy(name);
    setError("");
    try { await fn(); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  const saveScript = () => api(`/projects/${id}/script`, { method: "PUT", json: { script } }).then(() => setDirty(false));
  const saveBoard = () => api(`/projects/${id}/storyboard`, { method: "PUT", json: { storyboard: { scenes } } }).then(() => setDirty(false));

  if (!p) return <div className="grid min-h-[60vh] place-items-center">{error ? <ErrorNote>{error}</ErrorNote> : <Spinner className="size-8" />}</div>;

  const step = stepOf(p.status);

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => router.push("/app/media")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ChevronLeft className="size-4" /> My Media</button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">{p.title}</h1>
            <StatusBadge status={p.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <FileText className="size-3.5" /> {p.docName} · {p.mode === "guided" ? "DIY video" : "Direct video"} · {p.style} · {p.aspect} · {p.brand ? `Brand: ${p.brand.name}` : p.theme}
          </p>
        </div>
        <div className="flex gap-2">
          {p.status === "failed" && <Button variant="secondary" loading={busy === "retry"} onClick={() => act("retry", () => api(`/projects/${id}/retry`, { method: "POST" }))}><RefreshCw className="size-4" /> Retry</Button>}
          {p.hasVideo && p.status === "done" && <Button href={`/app/projects/${id}/edit`}><Scissors className="size-4" /> Edit video</Button>}
          {p.hasVideo && <Button variant={p.status === "done" ? "secondary" : "primary"} href={`/api/projects/${id}/video?download=1`}><Download className="size-4" /> Download MP4</Button>}
          <Button variant="ghost" aria-label="Delete project" loading={busy === "delete"} disabled={isWorking(p.status)}
            onClick={() => { if (confirm("Delete this project and its video?")) void act("delete", async () => { await api(`/projects/${id}`, { method: "DELETE" }); router.push("/app/media"); }); }}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <Stepper step={step} status={p.status} progress={p.progress} />

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {p.status === "failed" && (
            <Card className="mb-6 flex gap-3 border-red-200 bg-red-50 p-5">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
              <div><p className="font-medium text-red-700">Something went wrong</p><p className="mt-1 text-sm text-red-700/80">{p.error}</p><p className="mt-2 text-xs text-muted">Any reserved credits were returned. Retry picks up from the last completed step.</p></div>
            </Card>
          )}

          {isWorking(p.status) && <Working p={p} step={step} />}

          {p.status === "script_review" && script && (
            <>
              <ReviewBar
                title="Review your script" text="Edit any line. When it reads right, approve it and we'll storyboard the scenes."
                dirty={dirty}
                actions={<>
                  <Button variant="secondary" loading={busy === "rewrite"} onClick={() => act("rewrite", () => api(`/projects/${id}/rewrite-script`, { method: "POST" }))}><Wand2 className="size-4" /> Rewrite</Button>
                  <Button loading={busy === "approve"} onClick={() => act("approve", async () => { if (dirty) await saveScript(); await api(`/projects/${id}/approve-script`, { method: "POST" }); })}><Check className="size-4" /> Approve script</Button>
                </>}
                onSave={() => act("save", saveScript)} saving={busy === "save"}
              />
              <ScriptEditor script={script} onChange={(s) => { setScript(s); setDirty(true); }} />
            </>
          )}

          {p.status === "storyboard_review" && scenes && (
            <>
              <ReviewBar
                title="Review your storyboard" text={`${scenes.length} scenes · ≈ ${fmtSeconds(p.estimate.seconds)} · about ${p.estimate.credits.toLocaleString()} credits. Rendering starts when you approve.`}
                dirty={dirty}
                actions={<Button loading={busy === "approve"} onClick={() => act("approve", async () => { if (dirty) await saveBoard(); await api(`/projects/${id}/approve-storyboard`, { method: "POST" }); })}><Sparkles className="size-4" /> Approve & render</Button>}
                onSave={() => act("save", saveBoard)} saving={busy === "save"}
              />
              <StoryboardEditor scenes={scenes} theme={p.theme} aspect={p.aspect} brand={p.brand} onChange={(s) => { setScenes(s); setDirty(true); }} />
            </>
          )}

          {p.status === "done" && <Finished p={p} />}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Activity</h3>
            <ol className="mt-4 space-y-3">
              {events.slice().reverse().slice(0, 30).map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", e.level === "error" ? "bg-red-400" : e.level === "warn" ? "bg-amber-400" : "bg-brand")} />
                  <div className="min-w-0">
                    <p className={clsx("break-words", e.level === "error" ? "text-red-600" : e.level === "warn" ? "text-amber-700" : "text-fg/90")}>{e.message}</p>
                    <p className="text-xs text-muted">{new Date(e.createdAt).toLocaleTimeString()}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          {p.docPreview && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Source document</h3>
              <p className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted">{p.docPreview}</p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stepper({ step, status, progress }: { step: number; status: string; progress: number }) {
  return (
    <Card className="mt-6 p-4 sm:p-5">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {PIPELINE.map((s, i) => {
          const done = step > i;
          const current = step === i;
          const review = current && status.endsWith("review");
          return (
            <div key={s.key} className="min-w-0">
              <div className={clsx("h-1 rounded-full", done ? "bg-brand-gradient" : current ? (status === "failed" ? "bg-red-400" : review ? "bg-amber-400" : "bg-brand-2/60") : "bg-surface-2")} />
              <div className="mt-2.5 flex items-center gap-1.5">
                {done ? <Check className="size-3.5 shrink-0 text-emerald-600" /> : current && !review && status !== "failed" ? <Spinner className="size-3.5 shrink-0 text-brand" /> : null}
                <p className={clsx("truncate text-xs font-medium", done || current ? "text-fg" : "text-muted")}>{s.label}</p>
              </div>
              <p className="mt-0.5 hidden truncate text-[11px] text-muted sm:block">{review ? "Waiting for you" : s.detail}</p>
            </div>
          );
        })}
      </div>
      {status !== "done" && status !== "failed" && !status.endsWith("review") && (
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="bg-brand-gradient h-full rounded-full transition-all duration-700" style={{ width: `${progress}%` }} /></div>
          <span className="w-10 text-right text-xs text-muted">{progress}%</span>
        </div>
      )}
    </Card>
  );
}

function Working({ p, step }: { p: ProjectDetail; step: number }) {
  const current = PIPELINE[Math.max(0, Math.min(5, step))];
  return (
    <Card className="relative overflow-hidden p-8 text-center sm:p-12">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-transparent to-fuchsia-50" />
      <div className="relative mx-auto grid size-20 place-items-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand/15" />
        <div className="bg-brand-gradient relative grid size-16 place-items-center rounded-2xl shadow-xl shadow-indigo-900/20"><Wand2 className="size-7 text-white" /></div>
      </div>
      <h2 className="relative mt-6 text-xl font-semibold">{current.label}…</h2>
      <p className="relative mt-1 text-sm text-muted">{current.detail}. You can leave this page; we&apos;ll keep working.</p>
      {p.storyboard && (
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {p.storyboard.scenes.slice(0, 8).map((s, i) => (
            <div key={s.id} className={clsx("transition", step >= 4 && p.progress > 70 + (i / p.storyboard!.scenes.length) * 27 ? "opacity-100" : "opacity-40")}>
              <ScenePreview visual={s.visual} theme={p.theme} aspect={p.aspect} brand={p.brand} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReviewBar({ title, text, actions, dirty, onSave, saving }: {
  title: string; text: string; actions: React.ReactNode; dirty: boolean; onSave: () => void; saving: boolean;
}) {
  return (
    <Card className="sticky top-16 z-10 mb-4 flex flex-wrap items-center justify-between gap-4 border-amber-200 bg-white/95 p-4 lg:top-4">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {dirty && <Badge tone="warn">Unsaved</Badge>}
        <Button variant="ghost" disabled={!dirty} loading={saving} onClick={onSave}>Save</Button>
        {actions}
      </div>
    </Card>
  );
}

function Finished({ p }: { p: ProjectDetail }) {
  const portrait = p.aspect === "9:16";
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className={clsx("mx-auto bg-black", portrait ? "max-w-sm" : p.aspect === "1:1" ? "max-w-xl" : "")}>
          <video src={`/api/projects/${p.id}/video`} poster={`/api/projects/${p.id}/thumb`} controls playsInline className="w-full" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><span className="text-muted">Length </span>{fmtSeconds(p.durationSec ?? 0)}</span>
            <span><span className="text-muted">Scenes </span>{p.storyboard?.scenes.length}</span>
            <span><span className="text-muted">Credits used </span>{p.creditsCharged.toLocaleString()}</span>
          </div>
          <Button href={`/api/projects/${p.id}/video?download=1`} variant="secondary" size="sm"><Download className="size-4" /> Download</Button>
        </div>
      </Card>
      {p.script && (
        <details className="group rounded-2xl border border-line bg-white">
          <summary className="cursor-pointer list-none p-5 font-semibold [&::-webkit-details-marker]:hidden">Script <span className="text-sm font-normal text-muted">— {p.script.sections.length} sections</span></summary>
          <div className="space-y-4 border-t border-line p-5">
            {p.script.sections.map((s, i) => (
              <div key={i}><p className="text-sm font-semibold">{s.heading}</p><p className="mt-1 text-sm leading-relaxed text-muted">{s.narration}</p></div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
