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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("scripts")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

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

    return NextResponse.json({
      scripts: scripts || [],
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
