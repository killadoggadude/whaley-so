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
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const status = searchParams.get("status") || "active";
    const scope = searchParams.get("scope") || "mine"; // mine | community | all
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("scripts")
      .select(`
        *,
        user:users!inner(id, name, avatar_url, username)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by scope
    if (scope === "mine") {
      query = query.eq("user_id", user.id);
    } else if (scope === "community") {
      query = query.neq("user_id", user.id);
    }
    // "all" returns everything

    // Filter by status (archived/active)
    if (status === "active") {
      query = query.eq("is_archived", false);
    } else if (status === "archived") {
      query = query.eq("is_archived", true);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.ilike("script_text", `%${search}%`);
    }

    const { data: scripts, error, count } = await query;

    if (error) {
      console.error("List scripts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform user data to flatten
    const transformedScripts = scripts?.map(script => ({
      ...script,
      user_name: script.user?.name || script.user?.username || "Anonymous",
      user_avatar_url: script.user?.avatar_url,
    })) || [];

    return NextResponse.json({
      scripts: transformedScripts,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List scripts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list scripts" },
      { status: 500 }
    );
  }
}
