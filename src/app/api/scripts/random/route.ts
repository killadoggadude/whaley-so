import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "favorites"; // favorites | community
    const category = searchParams.get("category") || "all";
    const count = parseInt(searchParams.get("count") || "10");

    let query = supabase
      .from("scripts")
      .select("*")
      .eq("is_archived", false);

    // Filter by source
    if (source === "favorites") {
      // User's own scripts
      query = query.eq("user_id", user.id);
    } else {
      // Community scripts (exclude own)
      query = query.neq("user_id", user.id);
    }

    // Filter by category
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: scripts, error } = await query;

    if (error) {
      console.error("Random scripts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Shuffle and limit
    const shuffled = (scripts || [])
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    return NextResponse.json({
      scripts: shuffled,
      total: shuffled.length,
    });
  } catch (error) {
    console.error("Random scripts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get random scripts" },
      { status: 500 }
    );
  }
}
