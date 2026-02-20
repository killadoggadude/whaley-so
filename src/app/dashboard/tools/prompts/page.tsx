import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PromptGenerator } from "@/components/prompts/prompt-generator";
import { getPromptsAction } from "./actions";

export const metadata = {
  title: "Image Prompts | AI OFM",
  description:
    "Analyze images with Claude Vision to generate detailed recreation prompts",
};

export default async function PromptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const promptsResult = await getPromptsAction({ limit: 50 });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Image Prompts</h1>
        <p className="text-muted-foreground">
          Upload an inspiration image and Claude will analyze it to generate a
          detailed prompt for recreating the scene.
        </p>
      </div>

      <PromptGenerator initialPrompts={promptsResult.prompts} />
    </div>
  );
}
