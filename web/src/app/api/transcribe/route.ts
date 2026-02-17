import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";
import type { TranscriptionResult } from "@/types";

function detectPlatform(url: string): string {
  if (url.includes("instagram.com") || url.includes("instagr.am"))
    return "Instagram";
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("youtube.com") || url.includes("youtu.be"))
    return "YouTube";
  if (url.includes("twitter.com") || url.includes("x.com")) return "X";
  return "Unknown";
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

async function transcribeUrl(
  apiKey: string,
  videoUrl: string
): Promise<TranscriptionResult> {
  const platform = detectPlatform(videoUrl);

  try {
    const response = await fetch(
      "https://api.wavespeed.ai/api/v3/wavespeed-ai/openai-whisper-with-video",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ video_url: videoUrl }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        url: videoUrl,
        platform,
        transcript: "",
        word_count: 0,
        error: `API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();

    // Wavespeed returns transcript in data.text or data.output.text
    const transcript =
      data?.text ||
      data?.output?.text ||
      data?.data?.text ||
      data?.result?.text ||
      "";

    return {
      url: videoUrl,
      platform,
      transcript,
      word_count: countWords(transcript),
    };
  } catch (error) {
    return {
      url: videoUrl,
      platform,
      transcript: "",
      word_count: 0,
      error: error instanceof Error ? error.message : "Transcription failed",
    };
  }
}

export async function POST(request: Request) {
  try {
    // Verify auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Wavespeed API key
    const apiKey = await getDecryptedKey("wavespeed");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Wavespeed API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "At least one URL is required" },
        { status: 400 }
      );
    }

    // Filter out empty lines
    const validUrls = urls
      .map((u: string) => u.trim())
      .filter((u: string) => u.length > 0);

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs provided" },
        { status: 400 }
      );
    }

    // Process URLs sequentially to avoid rate limits
    const results: TranscriptionResult[] = [];
    for (const url of validUrls) {
      const result = await transcribeUrl(apiKey, url);
      results.push(result);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}
