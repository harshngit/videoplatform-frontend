"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Clapperboard, FileText, Film, Plus, Sparkles } from "lucide-react";
import { api, fmtSeconds, type Category, type ProjectSummary } from "@/lib/api";
import { CATEGORIES, categoryLabel, formatLabel } from "@/lib/video-options";
import { useSession } from "@/components/session";
import { Button, Card, PageTitle } from "@/components/ui";
import { StatusBadge, isWorking } from "@/components/status";

const FILTERS: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "All" }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

export default function Media() {
  const { user, meta } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [filter, setFilter] = useState<"all" | Category>("all");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      const { projects } = await api<{ projects: ProjectSummary[] }>("/projects");
      setProjects(projects);
      if (projects.some((p) => isWorking(p.status))) t = setTimeout(load, 3000);
    };
    void load();
    return () => clearTimeout(t);
  }, []);

  const done = projects?.filter((p) => p.status === "done") ?? [];
  const totalSec = done.reduce((s, p) => s + (p.durationSec ?? 0), 0);
  const shown = projects?.filter((p) => filter === "all" || (p.category ?? "informational") === filter) ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <PageTitle title="My Media" text="Every video you've generated, in one place." action={<Button href="/app/direct"><Plus className="size-4" /> New video</Button>} />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Videos made" value={String(done.length)} icon={Film} />
          <Stat label="Minutes produced" value={fmtSeconds(totalSec)} icon={Clapperboard} />
          <Stat label="Credits left" value={user.creditsSeconds.toLocaleString()} sub={`${meta.plans[user.plan].name} plan`} icon={Sparkles} />
        </div>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={clsx("rounded-full px-4 py-1.5 text-sm font-medium transition",
            filter === f.id ? "bg-brand text-white" : "bg-white text-muted hover:text-fg")}>{f.label}</button>
        ))}
      </div>

      {!projects ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="shimmer aspect-[4/3] rounded-2xl bg-white" />)}</div>
      ) : shown.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <div className="bg-brand-gradient grid size-14 place-items-center rounded-2xl"><FileText className="size-6 text-white" /></div>
          <h3 className="mt-5 text-lg font-semibold">{projects.length ? "Nothing in this filter" : "No videos yet"}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">Chat with the assistant or upload a document and your videos will show up here.</p>
          <Button href="/app/direct" className="mt-6"><Plus className="size-4" /> Generate a video</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => <ProjectTile key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <div className="flex items-center justify-between text-sm text-muted">{label}<Icon className="size-4" /></div>
      <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function ProjectTile({ p }: { p: ProjectSummary }) {
  return (
    <Link href={`/app/projects/${p.id}`} className="group">
      <Card className="overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-indigo-900/10">
        <div className="relative aspect-video overflow-hidden bg-surface-2">
          {p.hasThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/projects/${p.id}/thumb?v=${p.updatedAt}`} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-indigo-100 to-fuchsia-100">
              {isWorking(p.status) ? (
                <div className="w-2/3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full bg-brand transition-all" style={{ width: `${p.progress}%` }} /></div>
                  <p className="mt-2 text-center text-xs text-muted">{p.progress}%</p>
                </div>
              ) : <FileText className="size-8 text-brand/40" />}
            </div>
          )}
          <div className="absolute left-3 top-3"><StatusBadge status={p.status} /></div>
          {p.durationSec && <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-white">{fmtSeconds(p.durationSec)}</span>}
        </div>
        <div className="p-4">
          <h3 className="truncate font-semibold">{p.title}</h3>
          <p className="mt-1 truncate text-xs text-muted">{categoryLabel(p.category)} · {formatLabel(p.style, p.look)} · {p.aspect} · {new Date(p.createdAt).toLocaleDateString()}</p>
        </div>
      </Card>
    </Link>
  );
}
