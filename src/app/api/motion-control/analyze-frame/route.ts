import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

export const maxDuration = 60;

/**
 * Analyze an extracted video frame using Gemini 2.5 Flash.
 *
 * Downloads the frame image, sends it to Gemini with a structured
 * prompt-engineering template, and returns a detailed scene description.
 * The user can then copy this prompt into Higgsfield to recreate
 * the image with their AI model's identity.
 */

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

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
    const { frameUrl } = body as { frameUrl?: string };

    if (!frameUrl) {
      return NextResponse.json(
        { error: "frameUrl is required" },
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

    // Download the frame image and convert to base64
    console.log("[AnalyzeFrame] Downloading frame image...");
    const imageResponse = await fetch(frameUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download frame image (${imageResponse.status})` },
        { status: 500 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();

    console.log(
      `[AnalyzeFrame] Frame downloaded: ${(imageBuffer.byteLength / 1024).toFixed(0)}KB, ${mimeType}`
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

    console.log("[AnalyzeFrame] Calling Gemini 2.5 Flash...");

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
                { inlineData: { mimeType, data: base64Image } },
              ],
            },
          ],
        }),
      }
    );

    if (!analysisResponse.ok) {
      const errText = await analysisResponse.text();
      console.error("[AnalyzeFrame] API error:", errText);
      return NextResponse.json(
        { error: `Gemini analysis failed (${analysisResponse.status})` },
        { status: 500 }
      );
    }

    const analysisData = await analysisResponse.json();
    const prompt =
      analysisData?.candidates?.[0]?.content?.parts
        ?.filter((p: { text?: string }) => p.text)
        .map((p: { text: string }) => p.text)
        .join("") || "";

    if (!prompt.trim()) {
      console.error("[AnalyzeFrame] Empty analysis response");
      return NextResponse.json(
        { error: "Gemini returned an empty analysis. Please try again." },
        { status: 500 }
      );
    }

    console.log(
      `[AnalyzeFrame] Analysis complete: ${prompt.length} chars`
    );

    return NextResponse.json({ prompt: prompt.trim() });
  } catch (error) {
    console.error("Analyze frame error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze frame";

    if (errorMessage.includes("SAFETY")) {
      return NextResponse.json(
        {
          error:
            "Gemini flagged the image for safety reasons. Try a different frame or video.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
