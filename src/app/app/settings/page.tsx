"use client";
import { BrainCircuit, CreditCard, Film, ImageIcon, Mic, Sparkles, UserRound } from "lucide-react";
import { useSession } from "@/components/session";
import { Badge, Card } from "@/components/ui";

export default function Settings() {
  const { meta } = useSession();
  const i = meta.integrations;
  const rows = [
    { icon: BrainCircuit, name: "Claude", role: "Reads documents, writes scripts and storyboards", on: i.claude, env: "ANTHROPIC_API_KEY", fallback: "Offline heuristic writer" },
    { icon: Mic, name: "ElevenLabs", role: "Studio voiceover (most realistic)", on: i.elevenlabs, env: "ELEVENLABS_API_KEY", fallback: i.neuralVoice ? "Kokoro neural voice, running locally (free)" : i.macSay ? "macOS system voice" : "Silent, timed by word count" },
    { icon: ImageIcon, name: "Pexels", role: "Stock photos and footage for image-based formats", on: i.pexels, env: "PEXELS_API_KEY (free)", fallback: "Openverse public-domain images" },
    { icon: UserRound, name: "HeyGen", role: "AI presenter for the Avatar format", on: i.heygen, env: "HEYGEN_API_KEY + HEYGEN_AVATAR_ID", fallback: "Animated presenter card" },
    { icon: Sparkles, name: "fal.ai", role: "AI images (FLUX schnell) and cinematic video (Seedance 2.0; Kling or Wan selectable) — the cheapest option", on: i.fal, env: "FAL_KEY", fallback: "Free Pollinations images (watermarked); no AI video" },
    { icon: Sparkles, name: "OpenAI images", role: "Alternative image generator (gpt-image-1-mini)", on: i.openai, env: "OPENAI_API_KEY + IMAGE_PROVIDER=openai", fallback: "Not used" },
    { icon: Film, name: "Google Gemini", role: "Alternative for AI images and cinematic video (Gemini Omni Flash)", on: i.gemini, env: "GEMINI_API_KEY", fallback: "Not used" },
    { icon: CreditCard, name: "Stripe", role: "Subscriptions and checkout", on: i.stripe, env: "STRIPE_SECRET_KEY + price IDs", fallback: "Dev-mode plan switching" },
  ];
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">Integrations</h1>
      <p className="mt-1 text-muted">Active AI image generator: <b>{meta.providers.image ?? "none"}</b> · AI video: <b>{meta.providers.video ?? "none"}</b></p>
      <p className="mt-1 text-muted">Providers behind each pipeline step. Configure them in <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">server/.env</code> and restart the API.</p>
      <Card className="mt-8 divide-y divide-line">
        {rows.map((r) => (
          <div key={r.name} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface-2"><r.icon className="size-5 text-brand" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className="font-medium">{r.name}</p>{r.on ? <Badge tone="success">Connected</Badge> : <Badge tone="warn">Using fallback</Badge>}</div>
              <p className="text-sm text-muted">{r.role}</p>
              {!r.on && <p className="mt-1 text-xs text-muted">Now: {r.fallback}. Set <code className="text-brand">{r.env}</code> to enable.</p>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
