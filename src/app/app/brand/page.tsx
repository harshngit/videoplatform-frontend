"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Globe, ImagePlus, Palette, Pencil, Plus, Star, Trash2, Type, X } from "lucide-react";
import { api, type BrandKit } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Input, Label, PageTitle, Select, Spinner } from "@/components/ui";

type Draft = Omit<BrandKit, "id" | "logoUrl" | "watermarkUrl"> & {
  id?: string; logoUrl: string | null; watermarkUrl: string | null;
  logoFile: File | null; watermarkFile: File | null; removeLogo: boolean; removeWatermark: boolean;
  /** Opened from "Import from website": focus the address field. */
  importFirst?: boolean;
};

type Suggestion = {
  name: string; sourceUrl: string; primaryColor: string; secondaryColor: string; backgroundColor: string; textColor: string;
  headingFont: string; bodyFont: string; logo: { dataUrl: string; filename: string } | null; notes: string[];
};

/** "Import from website": the API reads the site; we fill the form for review. */
function WebsiteImport({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ host: string; notes: string[]; logo: boolean } | null>(null);

  async function run() {
    if (!url.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { suggestion: s } = await api<{ suggestion: Suggestion }>("/brand/import", { method: "POST", json: { url } });
      let logoFile: File | null = null;
      if (s.logo) {
        const blob = await fetch(s.logo.dataUrl).then((r) => r.blob());
        logoFile = new File([blob], s.logo.filename, { type: blob.type });
      }
      onChange({
        ...draft,
        // Keep a name the user already typed.
        name: !draft.id && (draft.name === "My brand" || !draft.name.trim()) ? s.name : draft.name,
        primaryColor: s.primaryColor, secondaryColor: s.secondaryColor, backgroundColor: s.backgroundColor, textColor: s.textColor,
        headingFont: s.headingFont, bodyFont: s.bodyFont,
        ...(logoFile ? { logoFile, removeLogo: false } : {}),
        importFirst: false,
      });
      setResult({ host: new URL(s.sourceUrl).hostname.replace(/^www\./, ""), notes: s.notes, logo: !!logoFile });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Globe className="size-4 text-brand" /> Import from website</h3>
      <p className="mt-0.5 text-xs text-muted">We read your site&apos;s colours, fonts, name and logo and fill in the kit. You can change anything before saving.</p>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourcompany.com" autoFocus={draft.importFirst} inputMode="url" autoComplete="url" aria-label="Website address" />
        <Button type="submit" loading={busy} disabled={!url.trim()} className="shrink-0">Import</Button>
      </form>
      {busy && <p className="mt-2 text-xs text-muted">Reading the site… this takes a few seconds.</p>}
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      {result && (
        <div className="mt-3 rounded-xl bg-white p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-emerald-700"><Check className="size-3.5" /> Imported from {result.host}{result.logo ? " · logo found" : " · no logo found, upload one below"}</p>
          {result.notes.map((n) => <p key={n} className="mt-1 text-muted">• {n}</p>)}
        </div>
      )}
    </section>
  );
}

const PRESETS = [
  { name: "Reel Indigo", primaryColor: "#4f22d8", secondaryColor: "#22d3ee", backgroundColor: "#0f0b2e", textColor: "#ffffff" },
  { name: "Clean Paper", primaryColor: "#2563eb", secondaryColor: "#f97316", backgroundColor: "#faf7f2", textColor: "#111827" },
  { name: "Sunset", primaryColor: "#e11d48", secondaryColor: "#f59e0b", backgroundColor: "#1a0b12", textColor: "#fff1f2" },
  { name: "Forest", primaryColor: "#059669", secondaryColor: "#a3e635", backgroundColor: "#03201a", textColor: "#ecfdf5" },
  { name: "Mono", primaryColor: "#111827", secondaryColor: "#6b7280", backgroundColor: "#ffffff", textColor: "#111827" },
];

const blank = (): Draft => ({
  isDefault: false, ...PRESETS[0], name: "My brand", headingFont: "Poppins", bodyFont: "Inter",
  logoUrl: null, logoPosition: "top-right", watermarkUrl: null, watermarkText: "", watermarkOpacity: 0.35,
  logoFile: null, watermarkFile: null, removeLogo: false, removeWatermark: false,
});

// An imported Google Font may be outside the suggested list; keep it selectable.
const withFont = (fonts: string[], current: string) => (fonts.includes(current) ? fonts : [current, ...fonts]);

/** Loads Google Fonts so previews show the real typefaces. */
function useGoogleFonts(families: string[]) {
  const key = [...new Set(families)].sort().join("|");
  useEffect(() => {
    if (!key) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${key.split("|").map((f) => `family=${encodeURIComponent(f)}:wght@400;700;800`).join("&")}&display=swap`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [key]);
}

export default function BrandPage() {
  const [kits, setKits] = useState<BrandKit[] | null>(null);
  const [fonts, setFonts] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api<{ kits: BrandKit[]; fonts: string[] }>("/brand").then((d) => { setKits(d.kits); setFonts(d.fonts); });
  useEffect(() => { void load(); }, []);
  useGoogleFonts([...(kits ?? []).flatMap((k) => [k.headingFont, k.bodyFont]), ...(draft ? [draft.headingFont, draft.bodyFont] : [])]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    const fields = {
      name: draft.name, primaryColor: draft.primaryColor, secondaryColor: draft.secondaryColor, backgroundColor: draft.backgroundColor,
      textColor: draft.textColor, headingFont: draft.headingFont, bodyFont: draft.bodyFont, logoPosition: draft.logoPosition,
      watermarkText: draft.watermarkText ?? "", watermarkOpacity: String(draft.watermarkOpacity), isDefault: String(draft.isDefault),
      removeLogo: String(draft.removeLogo), removeWatermark: String(draft.removeWatermark),
    };
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    if (draft.logoFile) fd.append("logo", draft.logoFile);
    if (draft.watermarkFile) fd.append("watermark", draft.watermarkFile);
    try {
      await api(draft.id ? `/brand/${draft.id}` : "/brand", { method: draft.id ? "PUT" : "POST", body: fd });
      await load();
      setDraft(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(k: BrandKit) {
    if (!confirm(`Delete the "${k.name}" brand kit? Videos already rendered keep their look.`)) return;
    await api(`/brand/${k.id}`, { method: "DELETE" });
    await load();
  }

  const edit = (k: BrandKit) => setDraft({ ...k, watermarkText: k.watermarkText ?? "", logoFile: null, watermarkFile: null, removeLogo: false, removeWatermark: false });

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <PageTitle
          title="Brand Kits"
          text="Lock in your colours, fonts, logo and watermark. Every video uses your default kit unless you pick another."
          action={!draft && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDraft({ ...blank(), importFirst: true })}><Globe className="size-4" /> Import from website</Button>
              <Button onClick={() => setDraft(blank())}><Plus className="size-4" /> New brand kit</Button>
            </div>
          )}
        />
      </Card>

      {draft ? (
        <Editor draft={draft} fonts={fonts} onChange={setDraft} onCancel={() => { setDraft(null); setError(""); }} onSave={save} busy={busy} error={error} />
      ) : !kits ? (
        <div className="grid place-items-center py-20"><Spinner className="size-8" /></div>
      ) : kits.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <div className="bg-brand-gradient grid size-14 place-items-center rounded-2xl"><Palette className="size-6 text-white" /></div>
          <h3 className="mt-5 text-lg font-semibold">No brand kits yet</h3>
          <p className="mt-1 max-w-md text-sm text-muted">Create one and every video will come out in your colours and typefaces, with your logo and watermark in place.</p>
          <Button className="mt-6" onClick={() => setDraft(blank())}><Plus className="size-4" /> Create brand kit</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kits.map((k) => (
            <Card key={k.id} className="overflow-hidden">
              <BrandFrame kit={k} />
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{k.name}</h3>
                  {k.isDefault && <Badge tone="brand"><Star className="size-3 fill-current" /> Default</Badge>}
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {[k.primaryColor, k.secondaryColor, k.backgroundColor, k.textColor].map((c, i) => (
                    <span key={i} className="size-6 rounded-full border border-line" style={{ background: c }} title={c} />
                  ))}
                  <span className="ml-2 truncate text-xs text-muted">{k.headingFont} / {k.bodyFont}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => edit(k)}><Pencil className="size-3.5" /> Edit</Button>
                  {!k.isDefault && <Button size="sm" variant="ghost" onClick={async () => { await api(`/brand/${k.id}/default`, { method: "POST" }); await load(); }}>Make default</Button>}
                  <Button size="sm" variant="ghost" className="ml-auto hover:text-red-600" onClick={() => remove(k)} aria-label={`Delete ${k.name}`}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ draft, fonts, onChange, onCancel, onSave, busy, error }: {
  draft: Draft; fonts: string[]; onChange: (d: Draft) => void; onCancel: () => void; onSave: () => void; busy: boolean; error: string;
}) {
  const set = (p: Partial<Draft>) => onChange({ ...draft, ...p });
  const logoRef = useRef<HTMLInputElement>(null);
  const wmRef = useRef<HTMLInputElement>(null);
  const preview = (f: File | null) => (f ? URL.createObjectURL(f) : null);
  const logoSrc = draft.logoFile ? preview(draft.logoFile) : draft.removeLogo ? null : draft.logoUrl;
  const wmSrc = draft.watermarkFile ? preview(draft.watermarkFile) : draft.removeWatermark ? null : draft.watermarkUrl;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
      <Card className="space-y-6 p-5 sm:p-6">
        <WebsiteImport draft={draft} onChange={onChange} />
        <div><Label>Kit name</Label><Input value={draft.name} onChange={(e) => set({ name: e.target.value })} /></div>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-brand" /> Colours</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => set({ primaryColor: p.primaryColor, secondaryColor: p.secondaryColor, backgroundColor: p.backgroundColor, textColor: p.textColor })}
                className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs hover:border-line-strong">
                <span className="flex">{[p.backgroundColor, p.primaryColor, p.secondaryColor].map((c, i) => <span key={i} className="-ml-1 size-3.5 rounded-full border border-white first:ml-0" style={{ background: c }} />)}</span>
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([["primaryColor", "Primary"], ["secondaryColor", "Accent"], ["backgroundColor", "Background"], ["textColor", "Text"]] as const).map(([k, label]) => (
              <div key={k}>
                <Label>{label}</Label>
                <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-white p-1.5 pr-3">
                  <input type="color" value={draft[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)} className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                  <input value={draft[k]} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set({ [k]: e.target.value } as Partial<Draft>)} className="w-full bg-transparent font-mono text-sm uppercase outline-none" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Type className="size-4 text-brand" /> Fonts</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Headings</Label><Select value={draft.headingFont} onChange={(e) => set({ headingFont: e.target.value })} style={{ fontFamily: draft.headingFont }}>{withFont(fonts, draft.headingFont).map((f) => <option key={f}>{f}</option>)}</Select></div>
            <div><Label>Body & captions</Label><Select value={draft.bodyFont} onChange={(e) => set({ bodyFont: e.target.value })} style={{ fontFamily: draft.bodyFont }}>{withFont(fonts, draft.bodyFont).map((f) => <option key={f}>{f}</option>)}</Select></div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ImagePlus className="size-4 text-brand" /> Logo</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-16 w-36 place-items-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface-2 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoSrc ? <img src={logoSrc} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">No logo</span>}
            </div>
            <Button size="sm" variant="secondary" onClick={() => logoRef.current?.click()}>{logoSrc ? "Replace" : "Upload logo"}</Button>
            {logoSrc && <Button size="sm" variant="ghost" onClick={() => set({ logoFile: null, removeLogo: true })}><X className="size-4" /> Remove</Button>}
            <input ref={logoRef} type="file" hidden accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(e) => { const f = e.target.files?.[0]; if (f) set({ logoFile: f, removeLogo: false }); e.target.value = ""; }} />
          </div>
          <Label>Position</Label>
          <div className="grid w-48 grid-cols-2 gap-1.5 rounded-xl border border-line bg-surface-2 p-1.5">
            {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => (
              <button key={pos} onClick={() => set({ logoPosition: pos })} className={clsx("h-9 rounded-lg text-xs font-medium capitalize",
                draft.logoPosition === pos ? "bg-brand text-white" : "bg-white text-muted hover:text-fg")}>{pos.replace("-", " ")}</button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold">Watermark</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-12 w-28 place-items-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface-2 p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {wmSrc ? <img src={wmSrc} alt="Watermark" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">Image</span>}
            </div>
            <Button size="sm" variant="secondary" onClick={() => wmRef.current?.click()}>{wmSrc ? "Replace" : "Upload image"}</Button>
            {wmSrc && <Button size="sm" variant="ghost" onClick={() => set({ watermarkFile: null, removeWatermark: true })}><X className="size-4" /> Remove</Button>}
            <input ref={wmRef} type="file" hidden accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(e) => { const f = e.target.files?.[0]; if (f) set({ watermarkFile: f, removeWatermark: false }); e.target.value = ""; }} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><Label hint="Used when no image">Text watermark</Label><Input value={draft.watermarkText ?? ""} maxLength={60} placeholder="e.g. ACME · Internal" onChange={(e) => set({ watermarkText: e.target.value })} /></div>
            <div>
              <Label hint={`${Math.round(draft.watermarkOpacity * 100)}%`}>Opacity</Label>
              <input type="range" min={0.05} max={1} step={0.05} value={draft.watermarkOpacity} onChange={(e) => set({ watermarkOpacity: Number(e.target.value) })} className="mt-3 w-full accent-[#1f0a9e]" />
            </div>
          </div>
        </section>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="size-4 accent-[#1f0a9e]" checked={draft.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} />
          Use as my default brand kit
        </label>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-2">
          <Button onClick={onSave} loading={busy} disabled={!draft.name.trim() || ![draft.primaryColor, draft.secondaryColor, draft.backgroundColor, draft.textColor].every((c) => /^#[0-9a-fA-F]{6}$/.test(c))}>
            <Check className="size-4" /> {draft.id ? "Save changes" : "Create brand kit"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>

      <div className="space-y-3 xl:sticky xl:top-6 xl:self-start">
        <p className="text-sm font-medium text-muted">Live preview</p>
        <Card className="overflow-hidden"><BrandFrame kit={{ ...draft, logoUrl: logoSrc, watermarkUrl: wmSrc }} large /></Card>
        <p className="text-xs text-muted">This is how titles, bullet scenes and captions will look in your videos. Logo and watermark stay fixed on every frame.</p>
      </div>
    </div>
  );
}

/** A CSS mock of a rendered video frame using the kit's styling. */
function BrandFrame({ kit, large }: { kit: Pick<BrandKit, "primaryColor" | "secondaryColor" | "backgroundColor" | "textColor" | "headingFont" | "bodyFont" | "logoUrl" | "logoPosition" | "watermarkUrl" | "watermarkText" | "watermarkOpacity">; large?: boolean }) {
  const [v, h] = kit.logoPosition.split("-");
  const s = large ? 1 : 0.62;
  return (
    <div className="relative aspect-video overflow-hidden" style={{ background: `linear-gradient(135deg, ${kit.backgroundColor}, ${kit.backgroundColor} 45%, ${kit.primaryColor}33)`, color: kit.textColor, fontFamily: `'${kit.bodyFont}', sans-serif` }}>
      <div className="absolute -right-10 -top-10 size-48 rounded-full opacity-30 blur-3xl" style={{ background: kit.primaryColor }} />
      <div className="absolute -bottom-12 left-10 size-40 rounded-full opacity-25 blur-3xl" style={{ background: kit.secondaryColor }} />
      <div className="absolute left-0 top-0 h-1 w-2/3" style={{ background: `linear-gradient(90deg, ${kit.primaryColor}, ${kit.secondaryColor})` }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {kit.logoUrl && <img src={kit.logoUrl} alt="" className="absolute object-contain" style={{ [v]: 14 * s, [h]: 16 * s, height: 30 * s, maxWidth: 130 * s }} />}
      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: `${36 * s}px ${44 * s}px` }}>
        <p style={{ fontSize: 10 * s, letterSpacing: 2, fontWeight: 700, color: kit.secondaryColor, textTransform: "uppercase" }}>— Quarterly briefing</p>
        <p style={{ fontFamily: `'${kit.headingFont}', sans-serif`, fontSize: 30 * s, fontWeight: 800, lineHeight: 1.1, marginTop: 6 * s }}>Revenue grew 18%</p>
        <div style={{ marginTop: 12 * s, display: "grid", gap: 6 * s, maxWidth: "70%" }}>
          {["Europe led with 31% more customers", "Support response under 3 hours"].map((b, i) => (
            <div key={b} className="flex items-center" style={{ gap: 8 * s, padding: `${6 * s}px ${10 * s}px`, borderRadius: 10 * s, background: `${kit.textColor}12`, fontSize: 11 * s, fontWeight: 600 }}>
              <span className="grid shrink-0 place-items-center text-white" style={{ width: 16 * s, height: 16 * s, borderRadius: 5 * s, fontSize: 9 * s, background: `linear-gradient(135deg, ${kit.primaryColor}, ${kit.secondaryColor})` }}>{i + 1}</span>{b}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 flex justify-center" style={{ bottom: 12 * s }}>
        <span style={{ background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 10 * s, padding: `${3 * s}px ${9 * s}px`, borderRadius: 6 * s, fontWeight: 600 }}>Revenue grew in every region</span>
      </div>
      {(kit.watermarkUrl || kit.watermarkText) && (
        <div className="absolute" style={{ right: 14 * s, bottom: 10 * s, opacity: kit.watermarkOpacity }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {kit.watermarkUrl ? <img src={kit.watermarkUrl} alt="" style={{ height: 20 * s, maxWidth: 90 * s, objectFit: "contain" }} />
            : <span style={{ fontFamily: `'${kit.headingFont}', sans-serif`, fontSize: 10 * s, fontWeight: 700, letterSpacing: 1 }}>{kit.watermarkText}</span>}
        </div>
      )}
    </div>
  );
}
