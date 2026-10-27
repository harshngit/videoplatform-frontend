"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowUp, BarChart3, CloudUpload, FileText, ImagePlus, Lock, Paperclip, Pause, Play, ScrollText, SlidersHorizontal, Sparkles, UserRound, X, Clapperboard,
} from "lucide-react";
import {
  api, CHATS_CHANGED, DEFAULT_SETTINGS, fmtSeconds,
  type BrandKit, type Category, type ChatDetail, type ChatMessage, type ChatMode, type ChatProject, type ChatSettings, type ProjectSummary, type Style,
} from "@/lib/api";
import { useSession } from "./session";
import { Button, ErrorNote, Label, Select } from "./ui";
import { ProjectCard } from "./project-card";
import { CATEGORIES, FORMATS, PRESETS, categoryLabel, estimateCredits, formatLabel, formatOf, imagesFor } from "@/lib/video-options";
import { isWorking } from "./status";

// The three video types the product offers.
// Retired styles (hybrid, voice-over) open as motion graphics with images.
const normalize = (st: Partial<ChatSettings>): ChatSettings => {
  const merged = { ...DEFAULT_SETTINGS, ...st };
  if (merged.style === "hybrid" || merged.style === "voiceover") return { ...merged, style: "motion", look: "images" };
  return merged;
};
const MAX_IMAGES = 8;

// Each mode is its own page in the sidebar: Direct Video, DIY Video, Chat.
const MODES: Record<ChatMode, { headline: string; text: string; placeholder: string }> = {
  direct: {
    headline: "Upload a document to generate a video",
    text: "We'll write, voice and render the whole video for you, start to finish.",
    placeholder: "Describe the video, paste text, or attach a document…",
  },
  script: {
    headline: "Upload a document to build your video step by step",
    text: "We'll write the script first. You edit the script and every scene before anything renders.",
    placeholder: "What should the video cover? Attach a document to start from it…",
  },
  chat: {
    headline: "Talk to me or upload a document to generate a video",
    text: "Chat it through with the assistant, then turn the conversation into a video.",
    placeholder: "Hi! Tell me how we can maximise your video generation…",
  },
};

type Pending = { text: string; attachmentName: string | null } | null;

// Per-browser conveniences: last-used settings, and the videos started from the generate screen this session.
const SETTINGS_KEY = "rr:settings";
const runsKey = (mode: ChatMode) => `rr:runs:${mode}`;
const readStore = <T,>(store: "local" | "session", key: string, fallback: T): T => {
  try { const v = (store === "local" ? localStorage : sessionStorage).getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const writeStore = (store: "local" | "session", key: string, value: unknown) => {
  try { (store === "local" ? localStorage : sessionStorage).setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};
// File names become readable titles: "expense-policy_2027.md" → "Expense Policy 2027".
const titleCase = (t: string) => t.replace(/\b([a-z])/g, (m) => m.toUpperCase());
const titleFrom = (text: string, file: File | null) =>
  (file && (!text || text.length > 80) ? titleCase(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")) : text.split(/\s+/).slice(0, 8).join(" "))
    .slice(0, 80).replace(/[\s,.;:!?-]+$/, "") || "New video";

/**
 * Direct and DIY Video are a plain generate screen (prompt or document in, live
 * video card out). Chat is a conversation, saved in the sidebar's history.
 */
export function Studio({ mode, chatId }: { mode: ChatMode; chatId?: string }) {
  const router = useRouter();
  const { user, meta, refresh } = useSession();
  const plan = meta.plans[user.plan];
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [projects, setProjects] = useState<Record<string, ChatProject>>({});
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [runs, setRuns] = useState<string[]>([]);
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const imagesRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [drag, setDrag] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { api<{ kits: BrandKit[] }>("/brand").then((d) => setKits(d.kits)).catch(() => {}); }, []);

  // Generate screen: restore last-used settings and this session's videos.
  useEffect(() => {
    if (chatId) return;
    const saved = readStore<Partial<ChatSettings>>("local", SETTINGS_KEY, {});
    setSettings(normalize(saved));
    if (mode !== "chat") setRuns(readStore<string[]>("session", runsKey(mode), []));
  }, [chatId, mode]);

  const loadRuns = useCallback(async (ids: string[]) => {
    const found = await Promise.all(ids.map((id) => api<{ project: ProjectSummary }>(`/projects/${id}`).then((d) => d.project, () => null)));
    setProjects(Object.fromEntries(found.flatMap((p) => (p ? [[p.id, p as ChatProject]] : []))));
  }, []);
  useEffect(() => { if (!chatId && runs.length) void loadRuns(runs); }, [chatId, runs, loadRuns]);

  const load = useCallback(async () => {
    if (!chatId) { await loadRuns(runs); return null; }
    const d = await api<{ chat: ChatDetail; messages: ChatMessage[]; projects: Record<string, ChatProject> }>(`/chats/${chatId}`);
    setChat(d.chat);
    setMessages(d.messages);
    setProjects(d.projects);
    return d;
  }, [chatId, runs, loadRuns]);

  // First load picks up the chat's saved settings.
  useEffect(() => {
    if (!chatId) return;
    load().then((d) => {
      // Older chats may hold retired styles (hybrid, voice-over); show them as motion graphics.
      if (d) setSettings(normalize(d.chat.settings));
    }).catch(() => setError("Couldn't load this chat."));
  }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while any video in the thread is still working.
  const working = Object.values(projects).some((p) => isWorking(p.status));
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => { void load(); }, 2500);
    return () => clearInterval(t);
  }, [working, load]);
  const prevWorking = useRef(false);
  useEffect(() => { if (prevWorking.current && !working) void refresh(); prevWorking.current = working; }, [working, refresh]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, pending, projects]);

  function persist(patch: { settings?: ChatSettings }) {
    if (chatId) void api(`/chats/${chatId}`, { method: "PATCH", json: patch }).catch(() => {});
    else if (patch.settings) writeStore("local", SETTINGS_KEY, patch.settings);
  }

  const changeSettings = (patch: Partial<ChatSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    persist({ settings: next });
  };

  /** Picking a video type also applies that type's sensible defaults (style, format, length). */
  const changeCategory = (category: Category) => {
    const d = CATEGORIES.find((c) => c.id === category)!.defaults;
    changeSettings({ ...d, category, targetSeconds: Math.min(d.targetSeconds ?? settings.targetSeconds, plan.maxVideoSeconds) });
  };
  const credits = estimateCredits(meta, settings);

  async function send() {
    const body = text.trim();
    if (!body && !file) return;
    if (!chatId && mode !== "chat") return startVideo(body);
    setError("");
    setPending({ text: body, attachmentName: file?.name ?? null });
    const fd = new FormData();
    fd.append("text", body);
    fd.append("mode", "chat");
    fd.append("settings", JSON.stringify(settings));
    if (file) fd.append("file", file);
    setText("");
    setFile(null);
    try {
      if (chatId) {
        await api(`/chats/${chatId}/messages`, { method: "POST", body: fd });
        await load();
      } else {
        const { chat } = await api<{ chat: { id: string } }>("/chats", { method: "POST", body: fd });
        window.dispatchEvent(new Event(CHATS_CHANGED));
        router.replace(`/app/chat/${chat.id}`);
        return;
      }
      window.dispatchEvent(new Event(CHATS_CHANGED));
      void refresh();
    } catch (e) {
      setError((e as Error).message);
      setText(body);
    } finally {
      setPending(null);
    }
  }

  /** Direct / DIY Video: create the project straight away, no conversation. */
  async function startVideo(body: string) {
    setError("");
    if (!file) { setError("Choose a document to upload."); return; }
    setGenerating(true);
    const fd = new FormData();
    const fields: Record<string, string> = {
      title: titleFrom(body, file), mode: mode === "direct" ? "direct" : "guided", style: settings.style, theme: settings.theme,
      aspect: settings.aspect, voice: settings.voice, targetSeconds: String(settings.targetSeconds), captions: String(settings.captions),
      category: settings.category, look: settings.look, preset: settings.preset,
    };
    if (settings.brandKitId) fields.brandKitId = settings.brandKitId;
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    if (body) fd.append("text", body);
    if (file) fd.append("file", file);
    images.forEach((img) => fd.append("images", img));
    try {
      const { project } = await api<{ project: ProjectSummary }>("/projects", { method: "POST", body: fd });
      const next = [project.id, ...runs];
      setRuns(next);
      writeStore("session", runsKey(mode), next);
      setProjects((p) => ({ ...p, [project.id]: project as ChatProject }));
      setText("");
      setFile(null);
      setImages([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function generate(videoMode: "direct" | "guided") {
    if (!chatId) return;
    setGenerating(true);
    setError("");
    try {
      await api(`/chats/${chatId}/generate`, { method: "POST", json: { mode: videoMode, settings } });
      await load();
      void refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  const generateView = !chatId && mode !== "chat";
  const empty = !chatId && !pending;

  const current = MODES[mode];
  // Offer "Generate video" after a chat reply, until a video is started from it.
  const last = messages.at(-1);
  const chatHasReplies = mode === "chat" && last?.role === "assistant" && last.kind === "text";

  return (
    <div className="flex flex-col gap-4">
      {/* Video type tabs (as in the mockup) */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1">
        {CATEGORIES.map((c) => {
          const on = settings.category === c.id;
          return (
            <button key={c.id} onClick={() => changeCategory(c.id)} title={c.text}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition sm:min-w-40",
                on ? "bg-brand text-white shadow-lg shadow-indigo-900/20" : "text-brand hover:bg-white/70",
              )}>
              <c.icon className="size-4" />{c.label} Video
            </button>
          );
        })}
      </div>

      {generateView ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-5">
            <div className="shadow-card rounded-2xl bg-white p-5 sm:p-8">
              <h2 className="text-xl font-semibold sm:text-2xl">{current.headline}</h2>
              <p className="mt-1 text-sm text-muted">{current.text}</p>
              {file ? (
                <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
                  <div className="bg-brand-gradient grid size-12 shrink-0 place-items-center rounded-xl"><FileText className="size-6 text-white" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{file.name}</p>
                    <p className="text-sm text-muted">{file.size < 1024 ? "Under 1 KB" : `${Math.round(file.size / 1024).toLocaleString()} KB`} · ready to {mode === "direct" ? "generate" : "script"}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>Replace</Button>
                  <Button size="sm" variant="ghost" onClick={() => setFile(null)} aria-label="Remove document"><X className="size-4" /></Button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                  className={clsx("group mt-6 flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
                    drag ? "border-brand bg-indigo-50" : "border-line-strong hover:border-brand/40 hover:bg-surface-2")}
                >
                  <CloudUpload className="size-20 text-[#6b6b6b] transition group-hover:scale-105 group-hover:text-brand" strokeWidth={1.5} />
                  <p className="mt-3 text-lg font-semibold text-fg">Drop your document here</p>
                  <p className="mt-1 text-sm text-muted">or <span className="font-medium text-brand">click to browse</span> · PDF, DOCX, Markdown, TXT or CSV up to 25 MB</p>
                </button>
              )}
              {settings.look !== "text" && settings.style !== "avatar" && (
                <div className="mt-5 rounded-2xl border border-line bg-surface-2/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Your images <span className="font-normal text-muted">(optional)</span></p>
                      <p className="text-xs text-muted">
                        {settings.look === "images"
                          ? `This video uses ${imagesFor(meta, settings.targetSeconds)} images (${meta.images?.perMinute ?? 6} per minute). Yours go first; ${meta.images?.charged ? `AI fills the rest at $${meta.images.priceUsd.toFixed(2)} (${meta.images.credits} credits) each` : "stock photos fill the rest"}.`
                          : `Used first in the scenes; stock photos fill the rest. Up to ${MAX_IMAGES}.`}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => imagesRef.current?.click()} disabled={images.length >= MAX_IMAGES}><ImagePlus className="size-4" /> Add images</Button>
                  </div>
                  {images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {images.map((img, i) => (
                        <div key={i} className="group relative size-20 overflow-hidden rounded-xl border border-line bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(img)} alt={img.name} className="size-full object-cover" />
                          <button onClick={() => setImages(images.filter((_, k) => k !== i))} aria-label={`Remove ${img.name}`}
                            className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><X className="size-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={imagesRef} type="file" hidden multiple accept=".png,.jpg,.jpeg,.webp"
                    onChange={(e) => { const add = Array.from(e.target.files ?? []); setImages((cur) => [...cur, ...add].slice(0, MAX_IMAGES)); e.target.value = ""; }} />
                </div>
              )}
              {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Button size="lg" loading={generating} disabled={!file} onClick={() => startVideo("")}>
                  {mode === "direct" ? <><Clapperboard className="size-5" /> Generate video</> : <><ScrollText className="size-5" /> Write my script</>}
                </Button>
                <p className="text-sm text-muted">
                  {categoryLabel(settings.category)} · {formatLabel(settings.style, settings.look)} · {settings.aspect} · ≈ {fmtSeconds(settings.targetSeconds)} · ≈ {credits.toLocaleString()} credits
                  {mode === "script" && " · charged only after you approve"}
                </p>
              </div>
            </div>

            {runs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Your videos</h3>
                  <Link href="/app/media" className="text-sm font-medium text-brand hover:underline">See all in My Media</Link>
                </div>
                {runs.map((id) => projects[id] && <ProjectCard key={id} p={projects[id]} onChanged={load} />)}
              </div>
            )}
          </div>

          <div className="shadow-card h-fit rounded-2xl bg-white p-5 xl:sticky xl:top-6">
            <p className="mb-4 font-semibold">Video settings</p>
            <SettingsFields settings={settings} kits={kits} onChange={changeSettings} maxSeconds={plan.maxVideoSeconds} />
          </div>
          <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt,.md,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        </div>
      ) : (
      <div
        className={clsx("shadow-card relative flex min-h-[calc(100vh-15rem)] flex-col rounded-2xl bg-white transition", drag && "ring-4 ring-brand/20")}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
      >
        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {chatId && !chat ? (
            <div className="grid h-full min-h-[48vh] place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>
          ) : empty ? (
            <div className="flex h-full min-h-[48vh] flex-col items-center justify-center text-center">
              <button onClick={() => fileRef.current?.click()} className="group" aria-label="Upload a document">
                <CloudUpload className="size-24 text-[#6b6b6b] transition group-hover:scale-105 group-hover:text-brand" strokeWidth={1.5} />
              </button>
              <p className="mt-4 max-w-2xl text-xl font-semibold text-[#6b6b6b] sm:text-2xl">{current.headline}</p>
              <p className="mt-2 max-w-xl text-sm text-muted">{current.text}</p>
              <Button variant="secondary" className="mt-6" onClick={() => fileRef.current?.click()}><Paperclip className="size-4" /> Upload a document</Button>
              <p className="mt-2 text-xs text-muted">PDF, DOCX, Markdown, TXT or CSV · or just type below</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) => (
                <Message key={m.id} m={m} project={m.projectId ? projects[m.projectId] : undefined} onChanged={load} />
              ))}
              {pending && (
                <>
                  <Bubble role="user" text={pending.text} attachment={pending.attachmentName} />
                  <div className="flex items-center gap-3">
                    <AssistantAvatar />
                    <div className="typing flex gap-1 rounded-2xl bg-surface-2 px-4 py-3">
                      {[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-brand/60" />)}
                    </div>
                  </div>
                </>
              )}
              {chatHasReplies && !pending && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-brand/30 bg-indigo-50/40 p-4">
                  <Sparkles className="size-5 text-brand" />
                  <div className="mr-auto">
                    <p className="text-sm font-semibold">Ready to make it?</p>
                    <p className="text-xs text-muted">Turns this conversation into a {meta.styles[settings.style].name.toLowerCase()} · ≈ {credits.toLocaleString()} credits</p>
                  </div>
                  <Button size="sm" variant="secondary" loading={generating} onClick={() => generate("guided")}><ScrollText className="size-4" /> DIY: review first</Button>
                  <Button size="sm" loading={generating} onClick={() => generate("direct")}><Clapperboard className="size-4" /> Generate video</Button>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 z-10 rounded-b-2xl border-t border-line bg-white p-3 sm:p-5">
          <div className="mx-auto max-w-5xl">
            {error && <div className="mb-3"><ErrorNote>{error}</ErrorNote></div>}

            {file && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-brand">
                <FileText className="size-4" /> <span className="max-w-64 truncate">{file.name}</span>
                <button onClick={() => setFile(null)} aria-label="Remove attachment" className="rounded p-0.5 hover:bg-white"><X className="size-3.5" /></button>
              </div>
            )}

            <div className="relative flex items-end gap-2 rounded-2xl border border-line-strong bg-[#f7f7f9] py-2 pl-4 pr-2 focus-within:border-brand/40 focus-within:ring-4 focus-within:ring-brand/8">
              <textarea
                ref={taRef}
                rows={1}
                value={text}
                onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                placeholder={current.placeholder}
                className="max-h-[200px] flex-1 resize-none bg-transparent py-2 text-[15px] text-fg outline-none placeholder:text-fg/70"
              />
              <div className="flex items-center gap-0.5 pb-0.5 text-[#6b6b6b]">
                <button onClick={() => fileRef.current?.click()} className="rounded-lg p-2 hover:bg-white hover:text-brand" title="Attach a document"><Paperclip className="size-5" /></button>
                <button onClick={() => fileRef.current?.click()} className="hidden rounded-lg p-2 hover:bg-white hover:text-brand sm:block" title="Upload PDF, DOCX, Markdown or TXT"><FileText className="size-5" /></button>
                <button onClick={() => setShowSettings((s) => !s)} className={clsx("rounded-lg p-2 hover:bg-white hover:text-brand", showSettings && "bg-white text-brand")} title="Video settings"><SlidersHorizontal className="size-5" /></button>
                <button onClick={send} disabled={!!pending || generating || (!text.trim() && !file)} className="ml-1 grid size-9 place-items-center rounded-xl bg-brand text-white transition hover:bg-brand-hover disabled:opacity-40" aria-label="Send">
                  <ArrowUp className="size-5" />
                </button>
              </div>

              {showSettings && (
                <SettingsPanel settings={settings} kits={kits} onChange={changeSettings} onClose={() => setShowSettings(false)} maxSeconds={plan.maxVideoSeconds} />
              )}
            </div>
            <p className="mt-2 flex flex-wrap justify-between gap-2 px-1 text-xs text-muted">
              <span>{meta.styles[settings.style].name} · {settings.aspect} · ≈ {fmtSeconds(settings.targetSeconds)} · {kitLabel(settings.brandKitId, kits)}</span>
              <span>{mode === "chat" ? "Chatting is free" : `≈ ${credits.toLocaleString()} credits per video`}</span>
            </p>
            <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt,.md,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

const kitLabel = (id: string | null, kits: BrandKit[]) =>
  id === "none" ? "No brand kit" : (kits.find((k) => k.id === id) ?? kits.find((k) => k.isDefault))?.name ?? "No brand kit";

type SettingsProps = {
  settings: ChatSettings; kits: BrandKit[]; onChange: (p: Partial<ChatSettings>) => void; maxSeconds: number;
  /** Product demo: no visual-format picker, and an "Auto" style that follows the references. */
  demo?: boolean;
};

function SettingsPanel({ onClose, ...props }: SettingsProps & { onClose: () => void }) {
  return (
    <div className="shadow-card absolute bottom-full right-0 z-20 mb-2 max-h-[70vh] w-[min(92vw,380px)] overflow-y-auto rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">Video settings</p>
        <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Close settings"><X className="size-4" /></button>
      </div>
      <SettingsFields {...props} />
    </div>
  );
}

let presetFontsLoaded = false;
/** Loads the style presets' Google Fonts once, so the tiles preview the real typefaces. */
function usePresetFonts() {
  useEffect(() => {
    if (presetFontsLoaded) return;
    presetFontsLoaded = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${[...new Set(PRESETS.map((p) => p.font))].map((f) => `family=${encodeURIComponent(f)}:wght@800`).join("&")}&display=swap`;
    document.head.appendChild(link);
  }, []);
}

export function SettingsFields({ settings, kits, onChange, maxSeconds, demo }: SettingsProps) {
  usePresetFonts();
  const { user, meta } = useSession();
  const plan = meta.plans[user.plan];
  const format = formatOf(settings);
  return (
      <div className="space-y-5">
        {!demo && <div>
          <Label>Visual format</Label>
          <div className="grid gap-1.5">
            {FORMATS.map((f) => {
              const locked = !plan.styles.includes(f.style);
              const on = format === f.id;
              return (
                <button key={f.id} disabled={locked} onClick={() => onChange({ style: f.style, look: f.look })}
                  title={locked ? `Needs the ${meta.plans[meta.styles[f.style].minPlan].name} plan` : undefined}
                  className={clsx("flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                    on ? "border-brand bg-indigo-50" : "border-line hover:border-line-strong hover:bg-surface-2")}>
                  <span className={clsx("grid size-8 shrink-0 place-items-center rounded-lg", on ? "bg-brand text-white" : "bg-surface-2 text-brand")}>
                    {locked ? <Lock className="size-4" /> : <f.icon className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx("block text-sm font-medium", on && "text-brand")}>{f.label}</span>
                    <span className="block truncate text-xs text-muted">
                      {locked ? `${meta.plans[meta.styles[f.style].minPlan].name} plan`
                        : f.id === "images" && meta.images ? `${meta.images.perMinute} images/min${meta.images.charged ? ` · $${meta.images.priceUsd.toFixed(2)} per AI image` : ""}` : f.text}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>}
        <div>
          <Label hint={kits.length ? "Brand kit colours override" : undefined}>Style</Label>
          <div className="grid grid-cols-3 gap-2">
            {demo && (
              <button onClick={() => onChange({ preset: "auto" })} aria-pressed={settings.preset === "auto"}
                className={clsx("overflow-hidden rounded-xl border text-left transition", settings.preset === "auto" ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-line-strong")}>
                <div className="bg-brand-gradient flex h-12 items-center justify-center"><Sparkles className="size-5 text-white" /></div>
                <span className={clsx("block px-2 py-1 text-xs font-medium", settings.preset === "auto" && "text-brand")}>Auto</span>
              </button>
            )}
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => onChange({ preset: p.id })} aria-pressed={settings.preset === p.id}
                className={clsx("overflow-hidden rounded-xl border text-left transition", settings.preset === p.id ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-line-strong")}>
                <div className="flex h-12 flex-col justify-center gap-1 px-2" style={{ background: p.bg }}>
                  <span className="truncate text-[11px] font-extrabold leading-none" style={{ color: p.text, fontFamily: `'${p.font}', sans-serif` }}>Aa Title</span>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-6" style={{ background: p.accent, borderRadius: p.radius }} />
                    <span className="h-1.5 w-3" style={{ background: p.accent2, borderRadius: p.radius }} />
                  </span>
                </div>
                <span className={clsx("block px-2 py-1 text-xs font-medium", settings.preset === p.id && "text-brand")}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Size</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["16:9", "9:16", "1:1"] as const).map((a) => (
              <button key={a} onClick={() => onChange({ aspect: a })} className={clsx("rounded-xl border py-2 text-xs font-medium",
                settings.aspect === a ? "border-brand bg-indigo-50 text-brand" : "border-line hover:border-line-strong")}>
                {a === "16:9" ? "Landscape" : a === "9:16" ? "Vertical" : "Square"}<span className="block text-muted">{a}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label hint={fmtSeconds(settings.targetSeconds)}>Length</Label>
          <input type="range" min={20} max={maxSeconds} step={10} value={Math.min(settings.targetSeconds, maxSeconds)}
            onChange={(e) => onChange({ targetSeconds: Number(e.target.value) })} className="w-full accent-[#1f0a9e]" />
        </div>
        <div>
          <Label>Brand kit</Label>
          <Select value={settings.brandKitId ?? ""} onChange={(e) => onChange({ brandKitId: e.target.value || null })}>
            <option value="">{kits.find((k) => k.isDefault) ? `Default (${kits.find((k) => k.isDefault)!.name})` : "Default (none set)"}</option>
            {kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            <option value="none">No brand kit</option>
          </Select>
        </div>
        <VoicePicker value={settings.voice} onChange={(voice) => onChange({ voice })} />
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="size-4 accent-[#1f0a9e]" checked={settings.captions} onChange={(e) => onChange({ captions: e.target.checked })} />
          Burn in captions
        </label>
      </div>
  );
}

function AssistantAvatar() {
  return <div className="bg-brand-gradient grid size-8 shrink-0 place-items-center rounded-full"><Sparkles className="size-4 text-white" /></div>;
}

function Bubble({ role, text, attachment, error }: { role: "user" | "assistant"; text: string; attachment?: string | null; error?: boolean }) {
  if (role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {attachment && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs text-muted"><FileText className="size-3.5" /> {attachment}</span>
        )}
        {text && <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[15px] leading-relaxed text-white">{text}</div>}
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className={clsx("max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md px-4 py-2.5 text-[15px] leading-relaxed",
        error ? "border border-red-200 bg-red-50 text-red-700" : "bg-surface-2 text-fg")}>{text}</div>
    </div>
  );
}

function Message({ m, project, onChanged }: { m: ChatMessage; project?: ChatProject; onChanged: () => void }) {
  if (m.role === "user") return <Bubble role="user" text={m.content} attachment={m.attachmentName} />;
  if (m.kind === "project" && project) {
    return (
      <div className="flex gap-3">
        <AssistantAvatar />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[15px] text-fg">{m.content}</p>
          <ProjectCard p={project} onChanged={onChanged} />
        </div>
      </div>
    );
  }
  return <Bubble role="assistant" text={m.content} error={m.kind === "error"} />;
}

/** Voice list with listen-before-you-pick samples (generated on the server's current voice engine). */
function VoicePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { meta } = useSession();
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);

  function toggle(id: string) {
    audio.current?.pause();
    if (playing === id) { setPlaying(null); return; }
    const a = new Audio(`/api/voices/${id}/preview`);
    audio.current = a;
    setLoading(id);
    a.oncanplay = () => setLoading(null);
    a.onended = () => setPlaying(null);
    a.onerror = () => { setLoading(null); setPlaying(null); };
    void a.play().then(() => setPlaying(id), () => setLoading(null));
  }

  return (
    <div>
      <Label hint={meta.integrations.elevenlabs ? "ElevenLabs studio voices" : "Neural voices"}>Voice</Label>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-1">
        {Object.entries(meta.voices).map(([id, label]) => {
          const [name, desc] = label.split(" — ");
          return (
            <div key={id} className={clsx("flex items-center gap-2 rounded-lg px-2 py-1.5", value === id ? "bg-indigo-50" : "hover:bg-surface-2")}>
              <button onClick={() => toggle(id)} aria-label={`Play ${name} sample`}
                className={clsx("grid size-7 shrink-0 place-items-center rounded-full", playing === id ? "bg-brand text-white" : "bg-white text-brand ring-1 ring-line-strong")}>
                {loading === id ? <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : playing === id ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
              </button>
              <button onClick={() => onChange(id)} className="min-w-0 flex-1 text-left">
                <p className={clsx("text-sm font-medium", value === id && "text-brand")}>{name}</p>
                <p className="truncate text-xs text-muted">{desc}</p>
              </button>
              {value === id && <span className="size-2 rounded-full bg-brand" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
