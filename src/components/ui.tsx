"use client";
import Link from "next/link";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={clsx("flex items-center gap-2.5 font-display text-xl font-bold tracking-tight", light ? "text-white" : "text-fg", className)}>
      <span className={clsx("grid size-9 place-items-center rounded-xl", light ? "bg-white/15 ring-1 ring-white/25" : "bg-brand-gradient shadow-lg shadow-violet-500/30")}>
        <svg viewBox="0 0 24 24" className="size-4 fill-white"><path d="M8 5.5v13l10-6.5z" /></svg>
      </span>
      Reel Reports
    </Link>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-md shadow-indigo-900/20 hover:bg-brand-hover",
  secondary: "border border-line-strong bg-white text-fg hover:border-brand/40 hover:bg-surface-2",
  soft: "bg-brand/8 text-brand hover:bg-brand/12",
  ghost: "text-muted hover:bg-brand/5 hover:text-fg",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
};

export function Button({
  variant = "primary", loading, className, children, href, size = "md", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; href?: string; size?: "sm" | "md" | "lg" }) {
  const cls = clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "h-8 px-3 text-sm", size === "md" && "h-10 px-4 text-sm", size === "lg" && "h-12 px-6 text-base",
    variants[variant], className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-2xl border border-line bg-surface shadow-card", className)}>{children}</div>;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "success" | "warn" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-line",
    brand: "bg-indigo-50 text-brand border-indigo-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

const field = "w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(field, props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(field, "resize-y leading-relaxed", props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(field, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236f6b95%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.9rem_center] bg-no-repeat pr-9", props.className)} />;
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-sm font-medium text-fg">{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("size-5 animate-spin text-muted", className)} />;
}

export function PageTitle({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {text && <p className="mt-1 text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}
