"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { api, fmtMinutes, type LedgerRow, type PlanId } from "@/lib/api";
import { useSession } from "@/components/session";
import { Badge, Card, ErrorNote } from "@/components/ui";
import { PricingGrid } from "@/components/pricing";
import { FORMATS } from "@/lib/video-options";

export default function BillingPage() {
  return <Suspense><Billing /></Suspense>;
}

function Billing() {
  const { user, meta, refresh } = useSession();
  const params = useSearchParams();
  const [data, setData] = useState<{ ledger: LedgerRow[]; stripe: boolean } | null>(null);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

  const load = () => api<{ ledger: LedgerRow[]; stripe: boolean }>("/billing").then(setData);
  useEffect(() => { void load(); }, []);

  async function choose(plan: PlanId) {
    setBusy(plan);
    setError("");
    try {
      if (data?.stripe) {
        const { url } = await api<{ url: string }>("/billing/checkout", { method: "POST", json: { plan } });
        window.location.href = url;
        return;
      }
      await api("/billing/dev-switch", { method: "POST", json: { plan } });
      await Promise.all([refresh(), load()]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  }

  const plan = meta.plans[user.plan];
  const status = params.get("status");

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">Plan & credits</h1>
      <p className="mt-1 text-muted">One credit is one second of animated video. Premium styles use more credits per second.</p>

      {status === "success" && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Payment received. Your credits will appear in a few seconds.</div>}
      {data && !data.stripe && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Development mode: Stripe isn&apos;t configured, so choosing a plan switches it instantly and grants its monthly credits.
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Current plan</p>
          <p className="mt-1 text-2xl font-semibold">{plan.name}</p>
          <p className="text-xs text-muted">${plan.priceMonthly}/month</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Credits remaining</p>
          <p className="mt-1 text-2xl font-semibold">{user.creditsSeconds.toLocaleString()}</p>
          <p className="text-xs text-muted">≈ {fmtMinutes(user.creditsSeconds)} of animated video</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Credits per second, by format</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FORMATS.map((f) => <Badge key={f.id} tone={plan.styles.includes(f.style) ? "brand" : "neutral"}>{f.label} {meta.styles[f.style].multiplier}×</Badge>)}
          </div>
        </Card>
      </div>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-muted">Plans</h2>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className="mt-4"><PricingGrid current={user.plan} onChoose={choose} busy={busy} /></div>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-muted">Credit history</h2>
      <Card className="mt-4 divide-y divide-line">
        {data?.ledger.length ? data.ledger.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
            <div className="min-w-0"><p className="truncate">{r.reason}</p><p className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</p></div>
            <span className={clsx("font-mono font-medium", r.deltaSeconds >= 0 ? "text-emerald-600" : "text-fg")}>{r.deltaSeconds >= 0 ? "+" : ""}{r.deltaSeconds.toLocaleString()}</span>
          </div>
        )) : <p className="px-5 py-6 text-sm text-muted">No activity yet.</p>}
      </Card>
    </div>
  );
}
