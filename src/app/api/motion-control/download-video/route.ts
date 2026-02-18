import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Downloads a video from a URL (Instagram, TikTok, etc.) and uploads it
 * to Supabase storage so we have a stable URL for further processing.
 *
 * For now, this handles direct video URLs. Social media URL resolution
 * (Instagram/TikTok shortlinks) may need a dedicated service later.
 */
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

    // Download the video
    console.log("[MotionControl] Downloading video from:", videoUrl.slice(0, 100));

    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to download video: HTTP ${response.status}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const videoBuffer = Buffer.from(await response.arrayBuffer());

    if (videoBuffer.length < 1000) {
      return NextResponse.json(
        { error: "Downloaded content too small — may not be a valid video. Try uploading the video directly." },
        { status: 400 }
      );
    }

    // Upload to Supabase storage
    const uuid = crypto.randomUUID();
    const ext = contentType.includes("webm") ? "webm" : "mp4";
    const filename = `motion-ref_${uuid.slice(0, 8)}.${ext}`;
    const filePath = `${user.id}/video/${uuid}_${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, videoBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get a signed URL for the uploaded video
    const { data: urlData } = await supabase.storage
      .from("assets")
      .createSignedUrl(filePath, 3600); // 1 hour

    if (!urlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      videoUrl: urlData.signedUrl,
      filePath,
      fileSize: videoBuffer.length,
    });
  } catch (error) {
    console.error("Motion control download error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to download video",
      },
      { status: 500 }
    );
  }
}
