import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get("script_id");

    if (!scriptId) {
      return NextResponse.json({ error: "Script ID required" }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already upvoted
    const { data: existing } = await supabase
      .from("script_upvotes")
      .select("id")
      .eq("user_id", user.id)
      .eq("script_id", scriptId)
      .single();

    if (existing) {
      // Remove upvote
      await supabase
        .from("script_upvotes")
        .delete()
        .eq("user_id", user.id)
        .eq("script_id", scriptId);

      // Decrement count
      await supabase.rpc("decrement_script_upvotes", { script_id: scriptId });

      return NextResponse.json({ upvoted: false });
    } else {
      // Add upvote
      await supabase
        .from("script_upvotes")
        .insert({ user_id: user.id, script_id: scriptId });

      // Increment count
      await supabase.rpc("increment_script_upvotes", { script_id: scriptId });

      return NextResponse.json({ upvoted: true });
    }
  } catch (error) {
    console.error("Upvote error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upvote" },
      { status: 500 }
    );
  }
}
