import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ModelList } from "@/components/models/model-list";
import { getModelsAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Models | AI OFM",
  description: "Create and manage your AI model profiles",
};

export default async function ModelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { models } = await getModelsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Models</h1>
        <p className="text-muted-foreground">
          Create and manage your AI model profiles.
        </p>
      </div>

      <ModelList initialModels={models} />
    </div>
  );
}
