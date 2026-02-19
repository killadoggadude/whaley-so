import { NextResponse } from "next/server";
import { humanizeText, detectAIPatterns, calculateAIScore } from "@/lib/humanizer";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, intensity } = body as {
      text?: string;
      intensity?: "light" | "medium" | "aggressive";
    };

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Humanize the text
    const humanized = humanizeText(text, { intensity: intensity || "medium" });

    // Detect patterns in original text
    const detectedPatterns = detectAIPatterns(text);

    // Calculate AI score of original
    const aiScore = calculateAIScore(text);

    return NextResponse.json({
      original: text,
      humanized,
      detectedPatterns,
      aiScore,
    });
  } catch (error) {
    console.error("Humanize error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to humanize text" },
      { status: 500 }
    );
  }
}
