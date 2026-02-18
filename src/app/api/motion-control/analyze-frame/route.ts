import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

export const maxDuration = 120;

/**
 * Two-step image recreation using Google's Gemini API directly.
 *
 * Step 1: Gemini 2.5 Flash analyzes the extracted frame and produces a
 *         detailed scene description (subject, scene, lighting, camera, etc.)
 *
 * Step 2: Nano Banana Pro (Gemini 3 Pro Image) receives the reference images
 *         + the frame + the scene description prompt, and generates a new image
 *         with the AI model's identity in the same scene.
 *
 * The generated image is uploaded to Supabase storage and its signed URL is returned.
 */

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/** Download an image URL and return base64 + mimeType */
async function downloadImageAsBase64(
  url: string
): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image (${res.status})`);
  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return {
    data: Buffer.from(buffer).toString("base64"),
    mimeType: contentType.split(";")[0].trim(),
  };
}

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
    const { frameUrl, referenceImageUrls } = body as {
      frameUrl?: string;
      referenceImageUrls?: string[];
    };

    if (!frameUrl) {
      return NextResponse.json(
        { error: "frameUrl is required" },
        { status: 400 }
      );
    }

    if (!referenceImageUrls || referenceImageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one reference image URL is required" },
        { status: 400 }
      );
    }

    const apiKey = await getDecryptedKey("google");
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Google API key not configured. Add it in Settings under 'Google'.",
        },
        { status: 400 }
      );
    }

    // ─── Step 1: Analyze frame with Gemini 2.5 Flash ────────────────

    console.log("[RecreateGemini] Step 1: Downloading frame for analysis...");
    const frame = await downloadImageAsBase64(frameUrl);
    console.log(
      `[RecreateGemini] Frame downloaded: ${(frame.data.length * 0.75 / 1024).toFixed(0)}KB`
    );

    const analysisPrompt = `you are the worlds best ai prompt engineer and prompt expert. I want to recreate this image.
analyse this image and give it to me in this format:

Subject details: Describe in detail what the person is wearing (clothing items, colors, textures, patterns), any visible accessories (jewelry, bags, hats), the subject's pose (body position, arm placement, head angle), and facial expression. Be extremely specific about every visible detail.

The scene: Describe the full environment - foreground, midground, and background. Include all visible elements like buildings, trees, objects, other people, furniture, etc. Specify whether it's indoor or outdoor, and describe spatial relationships between elements.

Lighting: Describe all light sources (natural, artificial), their direction, intensity, color temperature (warm/cool), shadow characteristics (hard/soft, long/short), and any special lighting effects like rim light, backlight, or fill light.

Camera: Describe the camera angle (high, low, eye-level), perspective (close-up, medium shot, wide), depth of field (shallow/deep, what's in focus vs blurred), estimated focal length, and composition (rule of thirds, centered, etc.).

Atmosphere: Describe the overall mood, ambiance, time of day if visible, weather conditions, and emotional feel of the scene.

Colors and textures: List the dominant colors throughout the image, describe textures of clothing, surfaces, skin, hair, and environment. Note any color contrasts or harmonies.

Technical quality: Describe the image resolution quality, focus sharpness, photography style (professional, casual, editorial), and any notable photographic techniques used.

IMPORTANT: Do NOT describe the person's face, facial features, skin color, ethnicity, hair color, or hair style. Only describe their clothing, accessories, pose, and expression type (like "serious expression" or "smiling"). The identity will be replaced with a different person.`;

    console.log("[RecreateGemini] Calling Gemini 2.5 Flash for analysis...");

    const analysisResponse = await fetch(
      `${GEMINI_API_BASE}/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: analysisPrompt },
                { inlineData: { mimeType: frame.mimeType, data: frame.data } },
              ],
            },
          ],
        }),
      }
    );

    if (!analysisResponse.ok) {
      const errText = await analysisResponse.text();
      console.error("[RecreateGemini] Analysis API error:", errText);
      return NextResponse.json(
        { error: `Gemini analysis failed (${analysisResponse.status})` },
        { status: 500 }
      );
    }

    const analysisData = await analysisResponse.json();
    const sceneDescription =
      analysisData?.candidates?.[0]?.content?.parts
        ?.filter((p: { text?: string }) => p.text)
        .map((p: { text: string }) => p.text)
        .join("") || "";

    if (!sceneDescription.trim()) {
      console.error("[RecreateGemini] Empty analysis response");
      return NextResponse.json(
        { error: "Gemini returned an empty scene analysis" },
        { status: 500 }
      );
    }

    console.log(
      `[RecreateGemini] Scene analysis complete: ${sceneDescription.length} chars`
    );

    // ─── Step 2: Generate image with Nano Banana Pro ────────────────

    console.log(
      `[RecreateGemini] Step 2: Downloading ${referenceImageUrls.length} reference images...`
    );

    // Download all reference images in parallel
    const refImages = await Promise.all(
      referenceImageUrls.map((url) => downloadImageAsBase64(url))
    );

    console.log(
      `[RecreateGemini] Reference images downloaded. Building generation request...`
    );

    // Build the parts array: reference images first, then the frame, then the prompt
    const refCount = refImages.length;
    const frameIndex = refCount + 1;
    const refIndices =
      refCount === 1
        ? "image 1"
        : refCount === 2
          ? "images 1 and 2"
          : `images ${Array.from({ length: refCount }, (_, i) => i + 1).join(", ")}`;

    const generationPrompt = `Using the identity, facial features, hair, and body type from ${refIndices}, recreate the scene shown in image ${frameIndex}. The person in the output must look like the person in ${refIndices}. Keep the exact same posing, outfit, background, lighting, and camera angle as image ${frameIndex}. No jewelry, no tattoos. Same posing and facial expression as in image ${frameIndex}.

Here is the detailed scene description to recreate:

${sceneDescription.trim()}`;

    // Build parts: ref images → frame → prompt text
    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    // Reference images (identity source)
    for (const img of refImages) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }

    // Frame (scene to recreate)
    parts.push({ inlineData: { mimeType: frame.mimeType, data: frame.data } });

    // Prompt
    parts.push({ text: generationPrompt });

    console.log(
      `[RecreateGemini] Calling Nano Banana Pro (gemini-3-pro-image-preview) with ${parts.length} parts...`
    );

    const genResponse = await fetch(
      `${GEMINI_API_BASE}/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );

    if (!genResponse.ok) {
      const errText = await genResponse.text();
      console.error("[RecreateGemini] Generation API error:", errText);

      // Check for safety/content policy blocks
      if (errText.includes("SAFETY") || errText.includes("blocked")) {
        return NextResponse.json(
          {
            error:
              "Image generation was blocked by safety filters. Try a different video or frame.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Image generation failed (${genResponse.status})` },
        { status: 500 }
      );
    }

    const genData = await genResponse.json();

    // Check for blocked responses
    if (genData?.candidates?.[0]?.finishReason === "SAFETY") {
      return NextResponse.json(
        {
          error:
            "Image generation was blocked by safety filters. Try a different video or frame.",
        },
        { status: 400 }
      );
    }

    // Extract the generated image from the response
    const outputParts = genData?.candidates?.[0]?.content?.parts || [];
    const imagePart = outputParts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );

    if (!imagePart?.inlineData?.data) {
      console.error(
        "[RecreateGemini] No image in response. Parts:",
        outputParts.map(
          (p: { text?: string; inlineData?: { mimeType: string } }) =>
            p.text ? "text" : p.inlineData ? "image" : "unknown"
        )
      );

      // Check if there's a text response explaining why
      const textPart = outputParts.find(
        (p: { text?: string }) => p.text
      );
      const textMessage = textPart?.text || "";

      return NextResponse.json(
        {
          error:
            textMessage.length > 0
              ? `Generation failed: ${textMessage.slice(0, 200)}`
              : "No image was generated. The model may have refused the request.",
        },
        { status: 500 }
      );
    }

    console.log(
      `[RecreateGemini] Image generated: ${imagePart.inlineData.mimeType}, ${(imagePart.inlineData.data.length * 0.75 / 1024).toFixed(0)}KB`
    );

    // ─── Step 3: Upload generated image to Supabase ─────────────────

    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const ext = imagePart.inlineData.mimeType.includes("png") ? "png" : "jpg";
    const uuid = crypto.randomUUID();
    const filePath = `${user.id}/motion-control/${uuid}_recreated.${ext}`;

    console.log(`[RecreateGemini] Uploading to Supabase: ${filePath}`);

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, imageBuffer, {
        contentType: imagePart.inlineData.mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[RecreateGemini] Upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload generated image: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get signed URL (1 hour expiry)
    const { data: urlData } = await supabase.storage
      .from("assets")
      .createSignedUrl(filePath, 3600);

    if (!urlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create signed URL for generated image" },
        { status: 500 }
      );
    }

    console.log("[RecreateGemini] Complete! Image uploaded and URL generated.");

    // Also extract any text response from the model
    const responseText = outputParts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join("");

    return NextResponse.json({
      imageUrl: urlData.signedUrl,
      sceneDescription: sceneDescription.trim(),
      modelResponse: responseText || undefined,
    });
  } catch (error) {
    console.error("Recreate with Gemini error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to recreate image";

    if (errorMessage.includes("SAFETY")) {
      return NextResponse.json(
        {
          error:
            "Image was blocked by safety filters. Try a different video or frame.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
