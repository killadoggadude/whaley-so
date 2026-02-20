import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TalkingHeadTabs } from "@/components/talking-head/talking-head-tabs";
import { getModelsAction } from "@/app/dashboard/models/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Talking Head | AI OFM",
  description: "Create lip-synced talking head videos from your models",
};

export default async function TalkingHeadPage({
  searchParams,
}: {
  searchParams: Promise<{ reelUrl?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const prefillVideoUrl = params.reelUrl || "";

  const modelsResult = await getModelsAction();
  const activeModels = modelsResult.models.filter((m) => m.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Talking Head</h1>
        <p className="text-muted-foreground">
          Create lip-synced talking head videos from a video transcript, AI
          voice, and portrait image.
        </p>
      </div>

      <TalkingHeadTabs aiModels={activeModels} prefillVideoUrl={prefillVideoUrl} />
    </div>
  );
}
