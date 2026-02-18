import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

/**
 * Poll for the Nano Banana Pro Edit task result.
 * Returns image URL(s) when completed.
 *
 * This is separate from the talking-head status route because the output
 * format is different (image URLs instead of video URLs).
 */
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
      if (response.status === 404) {
        return NextResponse.json({ status: "processing" });
      }
      return NextResponse.json(
        { status: "failed", error: `WaveSpeed API error (${response.status})` },
        { status: 200 }
      );
    }

    const data = await response.json();
    console.log("[RecreateStatus]", JSON.stringify(data).slice(0, 500));

    const status = data?.data?.status || data?.status;

    // Check for failure
    if (status === "failed" || status === "error") {
      return NextResponse.json({
        status: "failed",
        error: data?.data?.error || data?.error || "Image recreation failed",
      });
    }

    // Check for completion — extract image URL
    if (status === "completed" || status === "succeeded") {
      // Nano Banana Pro Edit returns image URL(s)
      const imageUrl =
        data?.data?.output?.image_url ||
        data?.data?.output?.url ||
        data?.output?.image_url ||
        data?.output?.url ||
        null;

      // Also check outputs array (may return multiple images)
      const outputs =
        data?.data?.outputs ||
        data?.outputs ||
        data?.data?.output?.outputs ||
        data?.data?.output?.images ||
        [];

      const finalUrl = imageUrl || (outputs.length > 0 ? outputs[0] : null);

      if (finalUrl) {
        return NextResponse.json({
          status: "completed",
          imageUrl: finalUrl,
          allImageUrls: outputs.length > 0 ? outputs : [finalUrl],
        });
      }

      // Try to find URL anywhere in the output
      const outputStr = JSON.stringify(data?.data?.output || data?.output || {});
      const urlMatch = outputStr.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/i);
      if (urlMatch) {
        return NextResponse.json({
          status: "completed",
          imageUrl: urlMatch[0],
          allImageUrls: [urlMatch[0]],
        });
      }

      return NextResponse.json({
        status: "failed",
        error: "Image recreation completed but no output URL found",
      });
    }

    // Still processing
    return NextResponse.json({ status: "processing" });
  } catch (error) {
    console.error("Recreate status error:", error);
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
