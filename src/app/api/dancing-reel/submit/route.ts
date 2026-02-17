import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get WaveSpeed API key
    const apiKey = await getDecryptedKey("wavespeed");
    if (!apiKey) {
      return NextResponse.json(
        { error: "WaveSpeed API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { imageUrl, prompt, duration, negative_prompt } = body as {
      imageUrl?: string;
      prompt?: string;
      duration?: number;
      negative_prompt?: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const validDuration = duration === 10 ? 10 : 5;

    // Call WaveSpeed Kling 2.6 Pro Image-to-Video API
    console.log("[DancingReel] Submitting job, duration:", validDuration);

    const response = await fetch(
      "https://api.wavespeed.ai/api/v3/kwaivgi/kling-v2.6-pro/image-to-video",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image: imageUrl,
          negative_prompt: negative_prompt || "",
          cfg_scale: 0.5,
          sound: false,
          duration: validDuration,
        }),
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
      console.error("[DancingReel] Submit error:", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await response.json();
    console.log("[DancingReel] Submit response:", JSON.stringify(data).slice(0, 500));

    // Extract task ID from response
    const taskId =
      data?.data?.id ||
      data?.id ||
      data?.data?.prediction_id ||
      data?.prediction_id;

    if (!taskId) {
      console.error("[DancingReel] No task ID in response:", data);
      return NextResponse.json(
        { error: "No task ID returned from WaveSpeed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ taskId });
  } catch (error) {
    console.error("DancingReel submit error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit dancing reel generation",
      },
      { status: 500 }
    );
  }
}
