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
    const { audioSignedUrl, imageSignedUrl, resolution } = body as {
      audioSignedUrl?: string;
      imageSignedUrl?: string;
      resolution?: string;
    };

    if (!audioSignedUrl || !imageSignedUrl) {
      return NextResponse.json(
        { error: "Audio and image URLs are required" },
        { status: 400 }
      );
    }

    const validResolution =
      resolution === "720p" ? "720p" : "480p";

    // Call WaveSpeed InfiniteTalk API
    console.log("[InfiniteTalk] Submitting job, resolution:", validResolution);

    const response = await fetch(
      "https://api.wavespeed.ai/api/v3/wavespeed-ai/infinitetalk",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio: audioSignedUrl,
          image: imageSignedUrl,
          resolution: validResolution,
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
      console.error("[InfiniteTalk] Submit error:", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await response.json();
    console.log("[InfiniteTalk] Submit response:", JSON.stringify(data).slice(0, 500));

    // Extract task ID from response
    const taskId =
      data?.data?.id ||
      data?.id ||
      data?.data?.prediction_id ||
      data?.prediction_id;

    if (!taskId) {
      console.error("[InfiniteTalk] No task ID in response:", data);
      return NextResponse.json(
        { error: "No task ID returned from WaveSpeed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ taskId });
  } catch (error) {
    console.error("InfiniteTalk submit error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit video generation",
      },
      { status: 500 }
    );
  }
}
