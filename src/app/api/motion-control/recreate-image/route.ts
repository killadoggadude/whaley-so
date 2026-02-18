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
 * The prompt should ideally be a Gemini-generated detailed scene description
 * (from the /analyze-frame endpoint). A generic fallback prompt is used if
 * no prompt is provided, but results will be significantly better with the
 * Gemini-analyzed prompt.
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

    // Cap at 3 reference images — prompt is designed for "images 1, 2, 3" + frame as "image 4"
    const cappedRefs = referenceImageUrls.slice(0, 3);

    // Build the images array: reference images first, then the frame last
    const images = [...cappedRefs, frameUrl];

    // Build prompt that refers to images by index
    // Reference images are 1..N, frame is the last one (N+1)
    const refCount = cappedRefs.length;
    const frameIndex = refCount + 1;
    const refIndices =
      refCount === 1
        ? "image 1"
        : refCount === 2
          ? "images 1 and 2"
          : `images ${Array.from({ length: refCount }, (_, i) => i + 1).join(", ")}`;

    // If a Gemini-analyzed prompt is provided, wrap it with identity swap instructions.
    // Otherwise fall back to the generic prompt.
    const hasGeminiPrompt = !!prompt?.trim();
    let finalPrompt: string;

    if (hasGeminiPrompt) {
      // Wrap the Gemini scene description with identity swap instructions
      finalPrompt = `Using the identity, facial features, hair, and body type from ${refIndices}, recreate the scene described below as shown in image ${frameIndex}. The person in the output must look like the person in ${refIndices}. Keep the exact same posing, outfit, background, lighting, and camera angle as image ${frameIndex}. No jewelry, no tattoos.\n\n${prompt!.trim()}`;
    } else {
      finalPrompt = `Recreate image ${frameIndex} using the identity, facial features, and body type from ${refIndices}. Keep the same posing, same outfit, same background, same lighting and same camera angle as image ${frameIndex}. Keep the subject's posing and facial expression from image ${frameIndex} but use the person from ${refIndices}. Do not change the background or environment. no jewelry no tattoo same posing and face expression as in image ${frameIndex}`;
    }

    console.log(
      `[RecreateImage] Submitting to Nano Banana Pro Edit (${hasGeminiPrompt ? "Gemini prompt" : "fallback prompt"}):`,
      `${images.length} images, prompt: ${finalPrompt.slice(0, 150)}...`
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
