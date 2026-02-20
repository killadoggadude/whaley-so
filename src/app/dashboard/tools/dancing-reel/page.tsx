import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DancingReelTabs } from "@/components/dancing-reel/dancing-reel-tabs";
import { getModelsAction } from "@/app/dashboard/models/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dancing Reel | AI OFM",
  description: "Create dancing reel videos from your model images using Kling 2.6 Pro",
};

export default async function DancingReelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const modelsResult = await getModelsAction();
  const activeModels = modelsResult.models.filter((m) => m.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Dancing Reel</h1>
        <p className="text-muted-foreground">
          Animate a static image into a dancing video using Kling 2.6 Pro.
          Upload a portrait image (ideally 9:16) and generate a 5 or 10 second
          dancing clip.
        </p>
      </div>

      <DancingReelTabs aiModels={activeModels} />
    </div>
  );
}
