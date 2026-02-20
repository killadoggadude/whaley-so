import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BillingContent } from "./billing-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing | AI OFM",
  description: "Manage your subscription and billing",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: models } = await supabase
    .from("ai_models")
    .select("id")
    .eq("user_id", user.id);

  return (
    <BillingContent
      user={{
        ...profile,
        email: user.email || "",
      }}
      modelsCount={models?.length || 0}
    />
  );
}
