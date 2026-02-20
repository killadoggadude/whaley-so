import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scriptId = searchParams.get("script_id");

  if (!scriptId) {
    return NextResponse.json({ error: "Script ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("scripts")
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq("id", scriptId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Archive script error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
