"use client";
import { use } from "react";
import { Studio } from "@/components/studio";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Studio key={id} mode="chat" chatId={id} />;
}
