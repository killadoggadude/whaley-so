import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ViralReelsLibrary } from "@/components/viral-reels/viral-reels-library";
import { getViralReelsAction } from "./actions";

export const metadata = {
  title: "Viral Reels | AI OFM",
  description: "Save and organize viral reels for content inspiration",
};

export default async function ViralReelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const reelsResult = await getViralReelsAction({ limit: 12, offset: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Viral Reels</h1>
        <p className="text-muted-foreground">
          Save viral reels as inspiration for your talking head content.
        </p>
      </div>

      <ViralReelsLibrary
        initialReels={reelsResult.reels}
        initialTotal={reelsResult.total}
      />
    </div>
  );
}
