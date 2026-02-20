import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MotionControlWorkflow } from "@/components/motion-control/motion-control-workflow";
import { getModelsAction } from "@/app/dashboard/models/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Motion Control | AI OFM",
  description:
    "Create motion-controlled videos by transferring movements from reference videos to your model",
};

export default async function MotionControlPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">Motion Control</h1>
        <p className="text-muted-foreground">
          Transfer movements from a reference video (Instagram reel, TikTok,
          etc.) to your model. The system extracts the first frame, recreates
          it with your model&apos;s identity, then generates a new video with
          the same motions.
        </p>
      </div>

      <MotionControlWorkflow aiModels={activeModels} />
    </div>
  );
}
