import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { videoUrl } = body as { videoUrl?: string };

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 }
      );
    }

    // 1. Download video from WaveSpeed CDN
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download video: ${videoResponse.status}` },
        { status: 500 }
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const mimeType =
      videoResponse.headers.get("content-type") || "video/mp4";
    const ext = mimeType.includes("webm") ? "webm" : "mp4";

    // 2. Upload to Supabase Storage
    const uuid = crypto.randomUUID();
    const filename = `talking-head_${uuid.slice(0, 8)}.${ext}`;
    const filePath = `${user.id}/video/${uuid}_${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, videoBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 3. Create asset record
    const { data: asset, error: dbError } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        filename,
        file_path: filePath,
        file_type: "video",
        mime_type: mimeType,
        file_size: videoBuffer.byteLength,
        tags: ["talking-head", "lip-sync", "wavespeed"],
        metadata: {
          source: "talking-head-wizard",
          original_url: videoUrl,
        },
      })
      .select("id")
      .single();

    if (dbError) {
      // Rollback: remove uploaded file
      await supabase.storage.from("assets").remove([filePath]);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ assetId: asset.id }, { status: 201 });
  } catch (error) {
    console.error("Video save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save video",
      },
      { status: 500 }
    );
  }
}
