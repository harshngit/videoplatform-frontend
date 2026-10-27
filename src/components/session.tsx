"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type Meta, type User } from "@/lib/api";

type Ctx = { user: User; meta: Meta; refresh: () => Promise<void> };
const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api<{ user: User }>("/auth/me");
      setUser(user);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    void refresh();
    api<Meta>("/meta").then(setMeta).catch(() => {});
  }, [refresh]);

  if (!user || !meta) {
    return <div className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>;
  }
  return <SessionCtx.Provider value={{ user, meta, refresh }}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("useSession outside SessionProvider");
  return c;
}
