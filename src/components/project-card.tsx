"use client";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, Check, Download, Film, RefreshCw, Scissors } from "lucide-react";
import { api, fmtSeconds, type ChatProject } from "@/lib/api";
import { Button } from "./ui";
import { PIPELINE, StatusBadge, isWorking, stepOf } from "./status";
import { categoryLabel, formatLabel } from "@/lib/video-options";

/** A video project rendered inline in a chat thread; the thread polls for updates. */
export function ProjectCard({ p, onChanged }: { p: ChatProject; onChanged: () => void }) {
  const step = stepOf(p.status);
  const portrait = p.aspect === "9:16";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="bg-brand-gradient grid size-9 shrink-0 place-items-center rounded-xl"><Film className="size-4 text-white" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{p.title}</p>
          <p className="text-xs text-muted">{p.mode === "direct" ? "Direct" : "DIY"} · {p.style === "demo" ? "" : `${categoryLabel(p.category)} · `}{formatLabel(p.style, p.look)} · {p.aspect}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      {p.status === "done" && p.hasVideo ? (
        <div className={clsx("bg-black", portrait && "flex justify-center")}>
          <video src={`/api/projects/${p.id}/video`} poster={p.hasThumb ? `/api/projects/${p.id}/thumb?v=${p.updatedAt}` : undefined} controls playsInline className={clsx(portrait ? "max-h-[520px]" : "w-full")} />
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="grid grid-cols-6 gap-1.5">
            {PIPELINE.map((s, i) => (
              <div key={s.key} title={s.label} className={clsx("h-1.5 rounded-full",
                step > i ? "bg-brand" : step === i ? (p.status === "failed" ? "bg-red-400" : p.status.endsWith("review") ? "bg-amber-400" : "animate-pulse bg-brand-2/60") : "bg-line")} />
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
            <span>{step >= 0 && step < 6 ? PIPELINE[step].label : p.status === "failed" ? "Stopped" : ""}</span>
            {isWorking(p.status) && <span>{p.progress}%</span>}
          </div>
          {p.status === "failed" && (
            <div className="mt-3 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /><span className="line-clamp-3">{p.error}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/60 px-4 py-3">
        {p.status === "script_review" && <Button size="sm" href={`/app/projects/${p.id}`}>Review script <ArrowRight className="size-4" /></Button>}
        {p.status === "storyboard_review" && <Button size="sm" href={`/app/projects/${p.id}`}>Review storyboard <ArrowRight className="size-4" /></Button>}
        {p.status === "failed" && (
          <Button size="sm" variant="secondary" onClick={async () => { await api(`/projects/${p.id}/retry`, { method: "POST" }); onChanged(); }}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        )}
        {p.status === "done" && (
          <>
            <span className="flex items-center gap-1 text-xs text-emerald-700"><Check className="size-3.5" /> Ready · {fmtSeconds(p.durationSec ?? 0)}</span>
            <Button size="sm" variant="secondary" className="ml-auto" href={`/app/projects/${p.id}/edit`}><Scissors className="size-4" /> Edit</Button>
            <Button size="sm" variant="secondary" href={`/api/projects/${p.id}/video?download=1`}><Download className="size-4" /> Download</Button>
          </>
        )}
        <Link href={`/app/projects/${p.id}`} className={clsx("text-xs font-medium text-brand hover:underline", p.status !== "done" && "ml-auto")}>Open project</Link>
      </div>
    </div>
  );
}
