import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

export const maxDuration = 120;

/**
 * Submit a motion control video generation job to WaveSpeed Kling 2.6 Pro.
 *
 * Takes:
 * - image: The recreated frame (AI model identity + original pose)
 * - video: The original reference video (motion source)
 * - character_orientation: "image" or "video"
 * - prompt: Optional refinement prompt
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

    const apiKey = await getDecryptedKey("wavespeed");
    if (!apiKey) {
      return NextResponse.json(
        { error: "WaveSpeed API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      imageUrl,
      videoUrl,
      prompt,
      negativePrompt,
      characterOrientation,
      duration,
    } = body as {
      imageUrl?: string;
      videoUrl?: string;
      prompt?: string;
      negativePrompt?: string;
      characterOrientation?: "image" | "video";
      duration?: number;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required (recreated frame)" },
        { status: 400 }
      );
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required (reference motion video)" },
        { status: 400 }
      );
    }

    const validOrientation = characterOrientation === "video" ? "video" : "image";

    console.log(
      "[MotionControl] Submitting job:",
      `orientation=${validOrientation}, duration=${duration || "auto"}`
    );

    // Call WaveSpeed Kling 2.6 Pro Motion Control API
    const payload: Record<string, unknown> = {
      image: imageUrl,
      video: videoUrl,
      character_orientation: validOrientation,
      keep_original_sound: true,
    };

    if (prompt?.trim()) {
      payload.prompt = prompt.trim();
    }

    if (negativePrompt?.trim()) {
      payload.negative_prompt = negativePrompt.trim();
    }

    const response = await fetch(
      "https://api.wavespeed.ai/api/v3/kwaivgi/kling-v2.6-pro/motion-control",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `WaveSpeed API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error("[MotionControl] Submit error:", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await response.json();
    console.log(
      "[MotionControl] Submit response:",
      JSON.stringify(data).slice(0, 500)
    );

    // Extract task ID
    const taskId =
      data?.data?.id ||
      data?.id ||
      data?.data?.prediction_id ||
      data?.prediction_id;

    if (!taskId) {
      console.error("[MotionControl] No task ID in response:", data);
      return NextResponse.json(
        { error: "No task ID returned from WaveSpeed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ taskId });
  } catch (error) {
    console.error("Motion control submit error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit motion control generation",
      },
      { status: 500 }
    );
  }
}
