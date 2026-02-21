import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

export const maxDuration = 120;

const SCRIPT_SYSTEM_PROMPT = `You are a scriptwriter specializing in short-form social media content (15-60 seconds).
Your scripts are for Instagram Reels featuring an AI avatar talking directly to camera.

Your goal is to analyze the provided reference scripts and understand what makes them successful, then create new scripts that follow the same patterns:

Analysis criteria for successful scripts:
- Hook effectiveness: How does it grab attention in the first 2 seconds?
- Tone and voice: What's the personality? (confessional, playful, authoritative, teasing)
- Emotional triggers: What desire or pain point does it tap into?
- Engagement patterns: How does it end? (question, challenge, teaser, curiosity gap)
- Sentence structure: Short and punchy? Conversational? Authentic?
- Language style: Direct address? Power words? Imperfect vs. polished?

Guidelines for generating new scripts:
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
      referenceScripts: providedRefScripts,
      category,
      count = 5,
    } = body as {
      prompt?: string;
      referenceScripts?: string[];
      category?: string;
      count?: number;
    };

    const apiKey = await getDecryptedKey("anthropic");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 400 }
      );
    }

    // Fetch top upvoted scripts - first try user's scripts, then community
    let referenceScripts: string[] = [];
    let referenceSource = "";
    
    // Try to get user's top scripts by upvotes
    const { data: userTopScripts } = await supabase
      .from("scripts")
      .select("script_text, upvotes_count, category")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .gt("upvotes_count", 0)
      .order("upvotes_count", { ascending: false })
      .limit(10);

    if (userTopScripts && userTopScripts.length > 0) {
      // Filter by category if provided
      const filtered = category && category !== "general"
        ? userTopScripts.filter(s => s.category === category)
        : userTopScripts;
      referenceScripts = filtered.slice(0, 5).map(s => s.script_text);
      referenceSource = "your top scripts";
    }

    // If not enough user scripts, fallback to community top scripts
    if (referenceScripts.length < 3) {
      const { data: communityTopScripts } = await supabase
        .from("scripts")
        .select("script_text, upvotes_count, category")
        .neq("user_id", user.id)
        .eq("is_archived", false)
        .gt("upvotes_count", 0)
        .order("upvotes_count", { ascending: false })
        .limit(10);

      if (communityTopScripts && communityTopScripts.length > 0) {
        const filtered = category && category !== "general"
          ? communityTopScripts.filter(s => s.category === category)
          : communityTopScripts;
        const communityScripts = filtered.slice(0, 5).map(s => s.script_text);
        
        if (referenceScripts.length > 0) {
          referenceScripts = [...referenceScripts, ...communityScripts].slice(0, 5);
          referenceSource = "your top scripts and community top scripts";
        } else {
          referenceScripts = communityScripts;
          referenceSource = "community top scripts";
        }
      }
    }

    // If still no reference scripts but prompt is missing, error
    if (referenceScripts.length === 0 && !prompt) {
      return NextResponse.json(
        { error: "Please provide a prompt since you don't have any scripts with upvotes yet. Write some scripts and get upvotes to enable AI-powered generation!" },
        { status: 400 }
      );
    }

    // Build the user prompt with analysis
    let userPrompt = "";

    if (referenceScripts.length > 0) {
      userPrompt += `Here are the top-performing scripts from ${referenceSource} (analyzed for what makes them successful):\n\n`;
      userPrompt += referenceScripts.map((s, i) => `${i + 1}. ${s}`).join("\n\n");
      userPrompt += `\n\nAnalyze what makes these scripts successful (hooks, tone, engagement patterns, emotional triggers) and create ${count} new scripts that follow the same winning patterns.\n`;
    }

    if (prompt) {
      userPrompt += `\nAdditional requirements: ${prompt}`;
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
