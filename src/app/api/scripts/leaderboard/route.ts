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
    const period = searchParams.get("period") || "7days"; // 7days, 30days, all
    const limit = parseInt(searchParams.get("limit") || "10");

    // Calculate the date filter
    let dateFilter;
    switch (period) {
      case "7days":
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "30days":
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        dateFilter = null;
    }

    let query = supabase
      .from("scripts")
      .select(`
        *,
        user:users!inner(id, name, avatar_url, username)
      `)
      .eq("is_archived", false)
      .order("upvotes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (dateFilter) {
      query = query.gte("created_at", dateFilter);
    }

    const { data: scripts, error } = await query;

    if (error) {
      console.error("Leaderboard error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform and add rank
    const leaderboard = scripts?.map((script, index) => ({
      ...script,
      rank: index + 1,
      user_name: script.user?.name || script.user?.username || "Anonymous",
      user_avatar_url: script.user?.avatar_url,
    })) || [];

    return NextResponse.json({
      leaderboard,
      period,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get leaderboard" },
      { status: 500 }
    );
  }
}
