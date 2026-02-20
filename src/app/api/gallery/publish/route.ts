import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GalleryVideoType } from "@/types";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { video_type, video_url, thumbnail_url, script_text, model_image_url, is_public } = body as {
      video_type: GalleryVideoType;
      video_url: string;
      thumbnail_url?: string;
      script_text?: string;
      model_image_url?: string;
      is_public?: boolean;
    };

    if (!video_type || !video_url) {
      return NextResponse.json(
        { error: "video_type and video_url are required" },
        { status: 400 }
      );
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const isPaidUser = userProfile?.subscription_tier && userProfile.subscription_tier !== "free";

    const finalIsPublic = isPaidUser ? (is_public !== false) : true;

    const { data, error } = await supabase
      .from("gallery")
      .insert({
        user_id: user.id,
        video_type,
        video_url,
        thumbnail_url: thumbnail_url || null,
        script_text: script_text || null,
        model_image_url: model_image_url || null,
        is_public: finalIsPublic,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Gallery publish error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      is_public: finalIsPublic,
    });
  } catch (error) {
    console.error("Gallery publish error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish to gallery" },
      { status: 500 }
    );
  }
}
