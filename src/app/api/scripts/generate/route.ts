import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

export const maxDuration = 120;

const SCRIPT_SYSTEM_PROMPT = `You are a scriptwriter specializing in short-form social media content (15-60 seconds).
Your scripts are for Instagram Reels featuring an AI avatar talking directly to camera.

Guidelines:
- Write in a personal, confessional, teasing tone
- Hook the viewer in the first 2 seconds
- Use short sentences, direct address ("you")
- End with engagement bait (question, challenge, tease)
- Instagram-safe but flirty/evocative - tap into fantasy or desire
- No explicit content - imply, don't describe
- Natural speech patterns - imperfect, conversational, real
- No AI writing patterns - avoid formulaic structures, filler words, robotic phrases
- Each script should be 1-3 sentences max
- Mix of hook styles: confessions, questions, challenges, teasers

Script types:
- flirty: Playful, teasing, suggestive
- confession: "I have to admit...", "Confession:..."
- teaser: Hinting at something, leaving wanting more
- question: Ask the viewer something
- challenge: Invite participation
- story: Brief narrative hook`;

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
    const {
      prompt,
      referenceScripts,
      category,
      count = 5,
    } = body as {
      prompt?: string;
      referenceScripts?: string[];
      category?: string;
      count?: number;
    };

    if (!prompt) {
      return NextResponse.json(
        { error: "A prompt is required to generate scripts" },
        { status: 400 }
      );
    }

    const apiKey = await getDecryptedKey("anthropic");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 400 }
      );
    }

    // Build the user prompt
    let userPrompt = "";

    if (referenceScripts && referenceScripts.length > 0) {
      userPrompt += `Generate ${count} new scripts similar to these examples:\n\n`;
      userPrompt += referenceScripts.map((s, i) => `${i + 1}. ${s}`).join("\n\n");
    }

    if (prompt) {
      userPrompt += `\n\nAdditional requirements: ${prompt}`;
    }

    if (category && category !== "general") {
      userPrompt += `\n\nTarget category: ${category}`;
    }

    userPrompt += `\n\nGenerate ${count} short, punchy scripts (1-3 sentences each). Make them feel authentic, conversational, and catchy. Each on a new line.`;

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SCRIPT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      return NextResponse.json(
        { error: `AI generation failed: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const generatedText = data.content?.[0]?.text || "";

    // Parse generated scripts - split by newlines and clean up
    const scripts = generatedText
      .split("\n")
      .map((line: string) => line.replace(/^[\d\-•\.]+\s*/, "").trim())
      .filter((line: string) => line.length > 10 && line.length < 500);

    return NextResponse.json({
      scripts,
      fullResponse: generatedText,
    });
  } catch (error) {
    console.error("Generate scripts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate scripts" },
      { status: 500 }
    );
  }
}
