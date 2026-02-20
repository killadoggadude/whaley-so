import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CuratedReelsLibrary } from "@/components/viral-reels/curated-reels-library";

export const metadata = {
  title: "Viral Reels | thirst.so",
  description: "Discover viral reels to recreate for your content",
};

export default async function ViralReelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("email")
    .eq("id", user.id)
    .single();

  const isAdmin = userProfile?.email === "tobias@thirst.so";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Viral Reels</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Manage the curated library of viral reels for your users."
            : "Discover viral reels to recreate. Find inspiration from top-performing content."}
        </p>
      </div>

      <CuratedReelsLibrary isAdmin={isAdmin} />
    </div>
  );
}
