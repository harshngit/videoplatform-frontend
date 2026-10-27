"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { api, type Meta, type PlanId } from "@/lib/api";
import { Button, Card } from "./ui";

export function PricingGrid({
  current, onChoose, busy,
}: { current?: PlanId; onChoose?: (p: PlanId) => void; busy?: PlanId | null }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => { api<Meta>("/meta").then(setMeta).catch(() => {}); }, []);

  if (!meta) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-96 rounded-2xl border border-line bg-white" />)}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {(Object.keys(meta.plans) as PlanId[]).map((id) => {
        const p = meta.plans[id];
        const featured = id === "pro";
        return (
          <Card key={id} className={clsx("relative flex flex-col p-6", featured && "border-brand/40 ring-4 ring-brand/8")}>
            {featured && <span className="bg-brand-gradient absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-semibold text-white">Most popular</span>}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold tracking-tight">${p.priceMonthly}</span>
              <span className="text-sm text-muted">/month</span>
            </div>
            <p className="mt-1 text-sm text-muted">{Math.round(p.monthlySeconds / 60)} credit-minutes {id === "free" ? "to start" : "every month"}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-2" />{f}</li>
              ))}
            </ul>
            <div className="mt-6">
              {onChoose ? (
                <Button className="w-full" variant={featured ? "primary" : "secondary"} disabled={current === id} loading={busy === id} onClick={() => onChoose(id)}>
                  {current === id ? "Current plan" : id === "free" ? "Downgrade" : `Choose ${p.name}`}
                </Button>
              ) : (
                <Button className="w-full" variant={featured ? "primary" : "secondary"} href="/signup">
                  {id === "free" ? "Start free" : `Get ${p.name}`}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
