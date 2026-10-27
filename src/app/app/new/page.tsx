import { redirect } from "next/navigation";

// The old step-by-step wizard now lives in the Generate Video chat.
export default function NewProject() {
  redirect("/app/direct");
}
