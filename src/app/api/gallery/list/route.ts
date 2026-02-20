import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GalleryItem, GalleryVideoType } from "@/types";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const videoType = searchParams.get("video_type") as GalleryVideoType | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sort") || "newest";

    let query = supabase
      .from("gallery")
      .select("*", { count: "exact" })
      .eq("is_public", true);

    if (videoType) {
      query = query.eq("video_type", videoType);
    }

    if (sortBy === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "most_viewed") {
      query = query.order("views", { ascending: false });
    } else if (sortBy === "most_remade") {
      query = query.order("remakes", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Gallery list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: GalleryItem[] = (data || []).map((item) => ({
      ...item,
      script_text: item.script_text || null,
      thumbnail_url: item.thumbnail_url || null,
      model_image_url: item.model_image_url || null,
    }));

    return NextResponse.json({
      items,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Gallery list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list gallery items" },
      { status: 500 }
    );
  }
}
