import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

export const maxDuration = 120;

/**
 * Recreate the extracted frame using the user's AI model reference images
 * via WaveSpeed Nano Banana Pro Edit API.
 *
 * The `images` array contains:
 * - First 1-3 images: AI model reference images (identity/face/body)
 * - Last image: The extracted frame to recreate
 *
 * The prompt instructs the model to swap identity while keeping pose/background/outfit.
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
    const { referenceImageUrls, frameUrl, prompt, aspectRatio } = body as {
      referenceImageUrls?: string[];
      frameUrl?: string;
      prompt?: string;
      aspectRatio?: string;
    };

    if (!referenceImageUrls || referenceImageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one reference image URL is required" },
        { status: 400 }
      );
    }

    if (!frameUrl) {
      return NextResponse.json(
        { error: "Frame URL is required" },
        { status: 400 }
      );
    }

    // Build the images array: reference images first, then the frame last
    const images = [...referenceImageUrls, frameUrl];

    // Build prompt that refers to images by index
    // Reference images are 1..N, frame is the last one (N+1)
    const refCount = referenceImageUrls.length;
    const frameIndex = refCount + 1;
    const refIndices =
      refCount === 1
        ? "image 1"
        : refCount === 2
          ? "images 1 and 2"
          : `images ${Array.from({ length: refCount }, (_, i) => i + 1).join(", ")}`;

    const defaultPrompt = `Recreate image ${frameIndex} using the identity, facial features, and body type from ${refIndices}. Keep the same posing, same outfit, same background, same lighting and same camera angle as image ${frameIndex}. Keep the subject's posing and facial expression from image ${frameIndex} but use the person from ${refIndices}. Do not change the background or environment. no jewerly no tattoo same posing and face expression as in image ${frameIndex}`;

    const finalPrompt = prompt?.trim() || defaultPrompt;

    console.log(
      "[RecreateImage] Submitting to Nano Banana Pro Edit:",
      `${images.length} images, prompt: ${finalPrompt.slice(0, 100)}...`
    );

    // Call WaveSpeed Nano Banana Pro Edit API
    const response = await fetch(
      "https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          images,
          aspect_ratio: aspectRatio || "9:16",
          resolution: "2k",
          output_format: "jpeg",
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
      console.error("[RecreateImage] Submit error:", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await response.json();
    console.log(
      "[RecreateImage] Submit response:",
      JSON.stringify(data).slice(0, 500)
    );

    // Extract task ID
    const taskId =
      data?.data?.id ||
      data?.id ||
      data?.data?.prediction_id ||
      data?.prediction_id;

    if (!taskId) {
      console.error("[RecreateImage] No task ID in response:", data);
      return NextResponse.json(
        { error: "No task ID returned from WaveSpeed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ taskId });
  } catch (error) {
    console.error("Recreate image error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit image recreation",
      },
      { status: 500 }
    );
  }
}
