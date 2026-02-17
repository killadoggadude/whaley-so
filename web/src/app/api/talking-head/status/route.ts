import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

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
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    // Get WaveSpeed API key
    const apiKey = await getDecryptedKey("wavespeed");
    if (!apiKey) {
      return NextResponse.json(
        { error: "WaveSpeed API key not configured" },
        { status: 400 }
      );
    }

    // Poll WaveSpeed for task status
    const pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${encodeURIComponent(taskId)}/result`;

    const response = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      // 404 could mean task is still starting
      if (response.status === 404) {
        return NextResponse.json({ status: "processing" });
      }
      return NextResponse.json(
        { status: "failed", error: `WaveSpeed API error (${response.status})` },
        { status: 200 } // Return 200 so client can handle gracefully
      );
    }

    const data = await response.json();
    console.log("[InfiniteTalk status]", JSON.stringify(data).slice(0, 300));

    const status = data?.data?.status || data?.status;

    // Check for failure
    if (status === "failed" || status === "error") {
      return NextResponse.json({
        status: "failed",
        error: data?.data?.error || data?.error || "Video generation failed",
      });
    }

    // Check for completion — extract video URL
    if (status === "completed" || status === "succeeded") {
      const videoUrl =
        data?.data?.output?.video_url ||
        data?.data?.output?.url ||
        data?.output?.video_url ||
        data?.output?.url ||
        null;

      // Also check outputs array
      const outputs =
        data?.data?.outputs ||
        data?.outputs ||
        data?.data?.output?.outputs ||
        [];

      const finalUrl = videoUrl || (outputs.length > 0 ? outputs[0] : null);

      if (finalUrl) {
        return NextResponse.json({
          status: "completed",
          videoUrl: finalUrl,
        });
      }

      return NextResponse.json({
        status: "failed",
        error: "Video completed but no output URL found",
      });
    }

    // Still processing
    return NextResponse.json({ status: "processing" });
  } catch (error) {
    console.error("InfiniteTalk status error:", error);
    return NextResponse.json(
      {
        status: "failed",
        error:
          error instanceof Error ? error.message : "Failed to check status",
      },
      { status: 200 }
    );
  }
}
