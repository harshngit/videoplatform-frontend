"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { CreditCard, Images, LogOut, Menu, MessageSquare, MessagesSquare, MonitorPlay, Palette, Plus, Settings2, Wrench, X, Zap } from "lucide-react";
import { SessionProvider, useSession } from "@/components/session";
import { Button, Logo } from "@/components/ui";
import { api, CHATS_CHANGED, type ChatSummary } from "@/lib/api";

// The ways to make a video, then the workspace pages.
const create = [
  { href: "/app/direct", label: "Direct Video", icon: Zap },
  { href: "/app/diy", label: "DIY Video", icon: Wrench },
  { href: "/app/demo", label: "Product Demo", icon: MonitorPlay },
  { href: "/app/chat", label: "Chat", icon: MessagesSquare },
];
const nav = [
  { href: "/app/media", label: "My Media", icon: Images },
  { href: "/app/brand", label: "Brand Kits", icon: Palette },
  { href: "/app/billing", label: "Plan & Credits", icon: CreditCard },
  { href: "/app/settings", label: "Integrations", icon: Settings2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  // The video editor uses the whole screen.
  if (path.endsWith("/edit")) return <>{children}</>;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[288px_1fr]">
      <aside className={clsx(
        "bg-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col px-4 py-6 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex items-center justify-between px-2">
          <Logo light />
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 lg:hidden" aria-label="Close menu"><X className="size-5" /></button>
        </div>
        <Sidebar />
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-indigo-950/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0 p-3 sm:p-5 lg:p-6">
        <header className="shadow-card flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 sm:px-6">
          <button onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-1.5 text-fg hover:bg-surface-2 lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
          <h2 className="truncate text-base font-semibold sm:text-lg">Welcome to Reel Reports</h2>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/app/billing" className="hidden rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted hover:text-fg sm:block">
              {user.creditsSeconds.toLocaleString()} credits
            </Link>
            <Button href="/app/direct" size="sm" className="h-9"><Plus className="size-4" /><span className="hidden sm:inline">New video</span></Button>
            <div className="bg-brand-gradient grid size-9 place-items-center rounded-full text-sm font-semibold text-white" title={user.email}>{user.name[0]?.toUpperCase()}</div>
          </div>
        </header>
        <main className="mt-4 sm:mt-5">{children}</main>
      </div>
    </div>
  );
}

function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[]>([]);

  useEffect(() => {
    const load = () => api<{ chats: ChatSummary[] }>("/chats").then((d) => setChats(d.chats)).catch(() => {});
    void load();
    window.addEventListener(CHATS_CHANGED, load);
    return () => window.removeEventListener(CHATS_CHANGED, load);
  }, []);

  const active = (href: string) => path.startsWith(href) || (href === "/app/media" && path.startsWith("/app/projects"));

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <>
      <nav className="mt-7 space-y-1">
        {create.map((n) => <NavItem key={n.href} {...n} on={active(n.href)} />)}
        <div className="!my-4 border-t border-white/15" />
        {nav.map((n) => <NavItem key={n.href} {...n} on={active(n.href)} />)}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <p className="border-b border-white/20 px-1 pb-2 text-xs font-medium uppercase tracking-wider text-white/70">Chats history</p>
        <div className="-mx-1 mt-2 flex-1 space-y-0.5 overflow-y-auto px-1 [scrollbar-width:thin]">
          {chats.length === 0 && <p className="px-1 py-2 text-sm text-white/60">Your conversations will appear here.</p>}
          {chats.map((c) => (
            <Link key={c.id} href={`/app/chat/${c.id}`} className={clsx(
              "flex items-center gap-2 truncate rounded-lg px-2 py-2 text-[15px] transition",
              path === `/app/chat/${c.id}` ? "bg-white/15 text-white" : "text-white/90 hover:bg-white/10",
            )}>
              <MessageSquare className="size-3.5 shrink-0 opacity-70" />
              <span className="truncate">{c.title}</span>
            </Link>
          ))}
        </div>
      </div>

      <button onClick={logout} className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-[#1f0a9e] py-3 text-[15px] font-medium shadow-lg shadow-indigo-950/30 transition hover:bg-[#2c14c0]">
        <LogOut className="size-5" /> Logout
      </button>
    </>
  );
}

function NavItem({ href, label, icon: Icon, on }: { href: string; label: string; icon: React.ElementType; on: boolean }) {
  return (
    <Link href={href} className={clsx(
      "flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[15px] font-medium transition",
      on ? "bg-[#1f0a9e] shadow-lg shadow-indigo-950/30" : "text-white/85 hover:bg-white/10 hover:text-white",
    )}>
      <Icon className="size-5" /> {label}
    </Link>
  );
}
