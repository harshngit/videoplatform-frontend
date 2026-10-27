import { redirect } from "next/navigation";

// Generate Video now lives on three pages; keep old ?mode= links working.
export default async function AppHome({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  redirect(mode === "chat" ? "/app/chat" : mode === "script" ? "/app/diy" : "/app/direct");
}
