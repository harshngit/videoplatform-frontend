import { ArrowRight, BarChart3, Briefcase, GraduationCap, ImageIcon, Info, Smartphone, Clapperboard, FileText, Film, Mic, PenLine, Sparkles, UserRound, Wand2, Eye, Zap, ShieldCheck, MessagesSquare, Palette } from "lucide-react";
import { Button, Card, Logo } from "@/components/ui";
import { PricingGrid } from "@/components/pricing";

const steps = [
  { icon: FileText, title: "Read document", text: "PDF, DOCX, Markdown or pasted text. We extract the content and structure." },
  { icon: PenLine, title: "Write script", text: "Claude turns it into a tight voiceover, faithful to your numbers.", review: true },
  { icon: Clapperboard, title: "Storyboard", text: "Each scene gets a visual: charts, stats, timelines, quotes.", review: true },
  { icon: Mic, title: "Voiceover", text: "Natural narration from ElevenLabs studio voices." },
  { icon: Wand2, title: "Visuals", text: "Motion graphics, an AI presenter, or cinematic B-roll." },
  { icon: Film, title: "Final video", text: "Rendered to MP4 with captions, ready to share." },
];

const styles = [
  { icon: BarChart3, name: "Motion graphics", text: "Animated charts, kinetic text and icons, rendered from your real numbers.", price: "1× credits", tag: "Free" },
  { icon: ImageIcon, name: "Motion graphics + images", text: "Your content animated beside relevant photos, yours or stock.", price: "1× credits", tag: "Free" },
  { icon: Film, name: "Visual video", text: "Full-screen photos and stock footage with narration and bold captions.", price: "1× credits", tag: "Free" },
  { icon: Clapperboard, name: "Cinematic AI", text: "Fully AI-generated footage scene by scene, for marketing that turns heads.", price: "10× credits", tag: "Cinematic" },
  { icon: UserRound, name: "Avatar presenter", text: "A lifelike AI presenter speaks your script. Ideal for training and updates.", price: "3× credits", tag: "Pro" },
];

const videoTypes = [
  { icon: GraduationCap, name: "Educational", text: "Step-by-step lessons with examples and a recap." },
  { icon: Briefcase, name: "Corporate", text: "Polished updates: results, what they mean, next steps." },
  { icon: Info, name: "Informational", text: "Clear, neutral explainers built on your facts." },
  { icon: Smartphone, name: "Social media", text: "Vertical shorts with a hook and word-by-word captions." },
];

const faqs = [
  { q: "What documents can I upload?", a: "PDF, Word (.docx), Markdown, plain text and CSV up to 25 MB. You can also paste text directly." },
  { q: "How do credits work?", a: "One credit is one second of finished video in the animated style. Presenter, hybrid and cinematic styles use more credits per second because they cost more to generate." },
  { q: "Can I edit before it renders?", a: "Yes. DIY Video pauses after the script and after the storyboard so you can edit every line and scene before any rendering credits are spent." },
  { q: "Are my numbers safe?", a: "The script writer is instructed to stay faithful to your document and keep figures exact. Data visuals are rendered from real values, not generated pixels, so charts are always sharp and correct." },
];

export default function Landing() {
  return (
    <div className="relative overflow-x-hidden">
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[900px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-300px] h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-violet-400/25 blur-[140px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#how" className="hover:text-fg">How it works</a>
          <a href="#styles" className="hover:text-fg">Styles</a>
          <a href="#pricing" className="hover:text-fg">Pricing</a>
          <a href="#faq" className="hover:text-fg">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" href="/login" size="sm">Sign in</Button>
          <Button href="/signup" size="sm">Start free</Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-xs text-muted">
          <Sparkles className="size-3.5 text-brand" /> Chat, upload or paste. Powered by Claude, ElevenLabs, HeyGen and Remotion
        </div>
        <h1 className="mx-auto mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          Turn any document into a <span className="text-gradient">video people watch</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Upload a report, research paper or policy. Get a narrated, animated explainer with sharp charts and captions, in minutes instead of weeks.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button href="/signup" size="lg">Create your first video <ArrowRight className="size-4" /></Button>
          <Button href="#how" variant="secondary" size="lg">See how it works</Button>
        </div>
        <p className="mt-4 text-xs text-muted">2 free minutes · no card required</p>

        <HeroPreview />
      </section>

      <section id="how" className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHead eyebrow="How it works" title="Six steps. Three ways in." text="Every video runs the same pipeline. Generate directly, review the script and storyboard first, or chat it through with the assistant." />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title} className="relative p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl border border-line-strong bg-surface-2"><s.icon className="size-5 text-brand" /></span>
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
              {s.review && <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600"><Eye className="size-3.5" /> Review point in DIY Video</span>}
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, title: "Direct video", text: "Send a topic or document and walk away. Every step runs automatically and the finished MP4 lands in your chat." },
            { icon: ShieldCheck, title: "DIY Video", text: "Edit the voiceover, swap visuals and fix numbers before rendering. Nothing is charged until you approve." },
            { icon: MessagesSquare, title: "Chat", text: "Talk through audience, key points and tone with the assistant, then turn the whole conversation into a video." },
          ].map((m) => (
            <Card key={m.title} className="p-6">
              <div className="flex items-center gap-2 font-semibold"><m.icon className="size-4 text-brand" /> {m.title}</div>
              <p className="mt-2 text-sm text-muted">{m.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="styles" className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHead eyebrow="Video types & formats" title="Any kind of video, any look" text="Pick what the video is for, how it should look, and one of six styles: Clean, Bold, Editorial, Playful, Tech or Minimal. Every video is narrated with natural, human-sounding voices." />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {videoTypes.map((t) => (
            <Card key={t.name} className="p-5">
              <t.icon className="size-5 text-brand" />
              <h3 className="mt-3 font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted">{t.text}</p>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {styles.map((s) => (
            <Card key={s.name} className="group p-6 transition hover:border-brand/40">
              <div className="flex items-start justify-between">
                <span className="bg-brand-gradient grid size-11 place-items-center rounded-xl"><s.icon className="size-5 text-white" /></span>
                <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-muted">{s.tag === "Free" ? "All plans" : `${s.tag}+`}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.name}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
              <p className="mt-4 text-xs font-medium text-brand">{s.price}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Card className="grid items-center gap-8 p-8 md:grid-cols-2 sm:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">Brand kits</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Every video, on brand</h2>
            <p className="mt-3 text-muted">Save your colours, heading and body fonts, logo and watermark once. They are applied to every scene automatically, so a whole team ships consistent videos.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Colours", Palette], ["Fonts", PenLine], ["Logo placement", Sparkles], ["Watermark", ShieldCheck]].map(([t, I]) => {
              const Icon = I as React.ElementType;
              return <div key={t as string} className="flex items-center gap-2.5 rounded-xl bg-surface-2 p-4 font-medium"><Icon className="size-4 text-brand" />{t as string}</div>;
            })}
          </div>
        </Card>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHead eyebrow="Pricing" title="Simple monthly credits" text="One credit = one second of animated video. Upgrade, downgrade or cancel anytime." />
        <div className="mt-14"><PricingGrid /></div>
      </section>

      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <SectionHead eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}<span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Card className="relative overflow-hidden p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-100 via-transparent to-fuchsia-100" />
          <h2 className="relative font-display text-3xl font-bold sm:text-4xl">Your next report deserves an audience</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted">Make your first video free. It takes about as long as reading this page.</p>
          <div className="relative mt-8"><Button href="/signup" size="lg">Start free <ArrowRight className="size-4" /></Button></div>
        </Card>
      </section>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo className="text-base" />
          <p>© {new Date().getFullYear()} Reel Reports. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-muted">{text}</p>}
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-r from-violet-600/30 to-cyan-500/30 blur-2xl" />
      <div className="relative grid gap-4 rounded-3xl border border-line-strong bg-surface/90 p-4 text-left backdrop-blur md:grid-cols-[1fr_1.6fr]">
        <div className="rounded-2xl border border-line bg-surface-2 p-5">
          <div className="flex items-center gap-2 text-xs text-muted"><FileText className="size-4" /> Q3-operations-report.pdf</div>
          <div className="mt-4 space-y-2">
            {[100, 92, 97, 60, 88, 95, 40].map((w, i) => <div key={i} className="h-2 rounded bg-surface-2" style={{ width: `${w}%` }} />)}
          </div>
          <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-brand">
            <div className="flex items-center gap-1.5 font-semibold"><PenLine className="size-3.5" /> Script · section 2</div>
            <p className="mt-1.5 leading-relaxed text-fg/70">Revenue reached 4.2 million dollars this quarter, up eighteen percent, with Europe leading the way…</p>
          </div>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-[#0b0a1f] text-white">
          <div className="absolute -left-10 top-6 size-56 rounded-full bg-violet-600/40 blur-3xl" />
          <div className="absolute bottom-0 right-0 size-56 rounded-full bg-cyan-500/30 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">Revenue by region</p>
              <p className="mt-1 font-display text-2xl font-bold">Europe led growth</p>
            </div>
            <div className="flex h-[45%] items-end gap-4">
              {[[55, "NA"], [92, "EU"], [40, "APAC"], [68, "LATAM"]].map(([h, l], i) => (
                <div key={l} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className={`w-full rounded-lg ${i === 1 ? "bg-gradient-to-t from-violet-500 to-cyan-400" : "bg-white/15"} animate-float`} style={{ height: `${h}%`, animationDelay: `${i * 0.4}s` }} />
                  <span className="text-[10px] text-muted">{l}</span>
                </div>
              ))}
            </div>
            <div className="mx-auto rounded-lg bg-black/50 px-3 py-1.5 text-xs">Europe led growth with 31% more customers</div>
          </div>
          <div className="absolute left-0 top-0 h-1 w-2/3 bg-gradient-to-r from-violet-500 to-cyan-400" />
        </div>
      </div>
    </div>
  );
}
