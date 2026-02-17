import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="rounded-lg bg-card border border-border p-6 transition-colors duration-200 hover:bg-card-hover">
        <p className="text-muted-foreground">
          Welcome{profile?.name ? `, ${profile.name}` : ""}! Your subscription
          tier is <strong>{profile?.subscription_tier ?? "free"}</strong>.
        </p>
      </div>
    </div>
  );
}
