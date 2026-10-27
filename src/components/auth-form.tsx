"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Card, ErrorNote, Input, Label, Logo } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api(`/auth/${mode}`, { method: "POST", json: signup ? form : { email: form.email, password: form.password } });
      router.push("/app");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-400/20 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted">{signup ? "Start with 2 free minutes of video." : "Sign in to continue to your videos."}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {signup && (
              <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ada Lovelace" autoComplete="name" /></div>
            )}
            <div><Label>Email</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" autoComplete="email" /></div>
            <div><Label hint={signup ? "8+ characters" : undefined}>Password</Label><Input required type="password" minLength={signup ? 8 : undefined} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={signup ? "new-password" : "current-password"} /></div>
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" className="w-full" loading={loading}>{signup ? "Create account" : "Sign in"}</Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-muted">
          {signup ? "Already have an account? " : "New here? "}
          <Link href={signup ? "/login" : "/signup"} className="font-medium text-brand hover:text-brand">{signup ? "Sign in" : "Create an account"}</Link>
        </p>
      </div>
    </div>
  );
}
