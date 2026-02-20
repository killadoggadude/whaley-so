import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScriptsClient } from "./scripts-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scripts | AI OFM",
  description: "Manage your video scripts for talking head reels",
};

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "flirty", label: "Flirty" },
  { value: "confession", label: "Confession" },
  { value: "teaser", label: "Teaser" },
  { value: "story", label: "Story" },
  { value: "question", label: "Question" },
  { value: "challenge", label: "Challenge" },
  { value: "general", label: "General" },
] as const;

export type ScriptCategory = (typeof CATEGORIES)[number]["value"];

export default async function ScriptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch initial scripts
  const { data: initialScripts } = await supabase
    .from("scripts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <ScriptsClient
      initialScripts={initialScripts || []}
      categories={CATEGORIES}
    />
  );
}
