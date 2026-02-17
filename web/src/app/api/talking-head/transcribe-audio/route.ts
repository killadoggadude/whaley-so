import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";
import type { WordTimestamp } from "@/types";
import OpenAI from "openai";

export const maxDuration = 120; // 2 min timeout for transcription

/**
 * POST /api/talking-head/transcribe-audio
 * Transcribe audio and derive word-level timestamps.
 *
 * Strategy:
 * 1. If OpenAI API key is configured → use OpenAI Whisper with true word-level timestamps
 * 2. Otherwise → fall back to WaveSpeed Whisper with estimated word timing
 *
 * Body: { audioUrl: string }
 * Returns: { words: WordTimestamp[], text: string }
 */
export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { audioUrl } = body;

    if (!audioUrl || typeof audioUrl !== "string") {
      return NextResponse.json(
        { error: "audioUrl is required" },
        { status: 400 }
      );
    }

    // Try OpenAI Whisper first (true word-level timestamps)
    const openaiKey = await getDecryptedKey("openai");
    if (openaiKey) {
      console.log("Using OpenAI Whisper for transcription (true word timestamps)");
      const result = await transcribeWithOpenAI(openaiKey, audioUrl);
      if (result) {
        return NextResponse.json(result);
      }
      // If OpenAI fails, fall through to WaveSpeed
      console.warn("OpenAI Whisper failed, falling back to WaveSpeed");
    }

    // Fall back to WaveSpeed Whisper (estimated word timing)
    const wavespeedKey = await getDecryptedKey("wavespeed");
    if (!wavespeedKey) {
      // If neither key is available, give a helpful error
      if (!openaiKey) {
        return NextResponse.json(
          { error: "No transcription API key configured. Add an OpenAI or WaveSpeed key in Settings." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "WaveSpeed API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    console.log("Using WaveSpeed Whisper for transcription (estimated word timestamps)");
    const result = await transcribeWithWaveSpeed(wavespeedKey, audioUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Transcribe audio error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// OpenAI Whisper — true word-level timestamps
// ---------------------------------------------------------------------------

/**
 * Transcribe audio using OpenAI Whisper API with `timestamp_granularities=["word"]`.
 * Returns actual per-word start/end times — no estimation needed.
 *
 * OpenAI requires file upload (not URL), so we download the audio first.
 */
async function transcribeWithOpenAI(
  apiKey: string,
  audioUrl: string
): Promise<{ words: WordTimestamp[]; text: string } | null> {
  try {
    // Download audio from URL to a buffer
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      console.error("Failed to download audio for OpenAI Whisper:", audioResponse.status);
      return null;
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" });

    // Create a File object for the OpenAI SDK
    const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mp3" });

    const client = new OpenAI({ apiKey });

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    // Extract full text
    const fullText = transcription.text || "";
    if (!fullText.trim()) {
      console.warn("OpenAI Whisper returned empty text");
      return null;
    }

    // Extract word-level timestamps
    // Response includes `words` array with { word, start, end }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawWords = (transcription as any).words;
    if (!Array.isArray(rawWords) || rawWords.length === 0) {
      console.warn("OpenAI Whisper returned no word timestamps");
      return null;
    }

    const words: WordTimestamp[] = rawWords
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (w: any) =>
          w &&
          typeof w.word === "string" &&
          typeof w.start === "number" &&
          typeof w.end === "number"
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((w: any) => ({
        word: (w.word as string).trim(),
        start: w.start as number,
        end: w.end as number,
      }))
      .filter((w: WordTimestamp) => w.word.length > 0);

    if (words.length === 0) {
      console.warn("OpenAI Whisper: all word timestamps filtered out");
      return null;
    }

    console.log(`OpenAI Whisper: got ${words.length} word timestamps`);
    return { words, text: fullText };
  } catch (error) {
    console.error("OpenAI Whisper transcription error:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// WaveSpeed Whisper — estimated word timing (fallback)
// ---------------------------------------------------------------------------

/**
 * Transcribe audio using WaveSpeed Whisper.
 * Returns segment-level timing; word timestamps are estimated proportionally.
 */
async function transcribeWithWaveSpeed(
  apiKey: string,
  audioUrl: string
): Promise<{ words: WordTimestamp[]; text: string }> {
  // Call WaveSpeed Whisper audio endpoint with timestamps enabled
  const response = await fetch(
    "https://api.wavespeed.ai/api/v3/wavespeed-ai/openai-whisper",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio: audioUrl,
        enable_timestamps: true,
        enable_sync_mode: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("WaveSpeed Whisper error:", response.status, errorText);
    throw new Error(`Transcription failed (${response.status}): ${errorText}`);
  }

  let data = await response.json();

  // Handle async response — poll if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiData = data as any;
  const status = apiData?.data?.status;
  const pollUrl = apiData?.data?.urls?.get || apiData?.data?.id;

  if (status && status !== "completed" && pollUrl) {
    console.log("WaveSpeed Whisper returned async status:", status, "- polling...");
    const polledData = await pollForResult(apiKey, pollUrl, apiData?.data?.id);
    if (polledData) {
      data = polledData;
    }
  }

  // Extract the output object from WaveSpeed response
  // Format: { code, message, data: { outputs: [{ text, text_details, srt }] } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const output = d?.data?.outputs?.[0];

  if (!output) {
    throw new Error("No transcription output from API");
  }

  const fullText: string = output.text || "";

  if (!fullText.trim()) {
    throw new Error("Could not detect speech in audio");
  }

  // Try to get word timestamps from multiple sources:
  // 1. Direct word-level timestamps (if API ever provides them)
  let words = extractDirectWordTimestamps(output);

  // 2. If no direct words, estimate from text_details segments
  if (words.length === 0 && Array.isArray(output.text_details)) {
    words = estimateWordTimingsFromSegments(output.text_details);
  }

  // 3. If still no words (e.g. only text, no text_details), parse SRT
  if (words.length === 0 && output.srt) {
    words = estimateWordTimingsFromSRT(output.srt);
  }

  // 4. Last resort: split text evenly over a default duration
  if (words.length === 0 && fullText.trim()) {
    // Assume ~150 words per minute for TTS audio
    const wordList = fullText.trim().split(/\s+/);
    const estimatedDuration = (wordList.length / 150) * 60;
    words = distributeWordsOverDuration(wordList, 0, estimatedDuration);
  }

  if (words.length === 0) {
    throw new Error("Could not generate word timestamps from transcription");
  }

  return { words, text: fullText };
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/**
 * Try to extract direct word-level timestamps if the API returns them.
 * Checks: output.words, output.segments[].words
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDirectWordTimestamps(output: any): WordTimestamp[] {
  // Check for direct words array
  if (Array.isArray(output.words) && output.words.length > 0) {
    const parsed = output.words
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (w: any) =>
          w &&
          (typeof w.word === "string" || typeof w.text === "string") &&
          typeof w.start === "number" &&
          typeof w.end === "number"
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((w: any) => ({
        word: ((w.word as string) || (w.text as string) || "").trim(),
        start: w.start as number,
        end: w.end as number,
      }))
      .filter((w: WordTimestamp) => w.word.length > 0);

    if (parsed.length > 0) return parsed;
  }

  // Check segments with nested words
  if (Array.isArray(output.segments)) {
    const allWords: WordTimestamp[] = [];
    for (const seg of output.segments) {
      if (seg && Array.isArray(seg.words)) {
        for (const w of seg.words) {
          if (
            w &&
            (typeof w.word === "string" || typeof w.text === "string") &&
            typeof w.start === "number" &&
            typeof w.end === "number"
          ) {
            const word = ((w.word as string) || (w.text as string) || "").trim();
            if (word) allWords.push({ word, start: w.start, end: w.end });
          }
        }
      }
    }
    if (allWords.length > 0) return allWords;
  }

  return [];
}

/**
 * Estimate word-level timestamps from WaveSpeed text_details segments.
 *
 * text_details format: [{ start: number, end: number, text: string }]
 * Each segment covers a phrase/sentence. We split the text into words
 * and distribute the segment duration proportionally by character length.
 */
function estimateWordTimingsFromSegments(
  textDetails: Array<{ start: number; end: number; text: string }>
): WordTimestamp[] {
  const allWords: WordTimestamp[] = [];

  for (const segment of textDetails) {
    if (!segment.text || typeof segment.start !== "number" || typeof segment.end !== "number") {
      continue;
    }

    const segWords = segment.text.trim().split(/\s+/).filter((w) => w.length > 0);
    if (segWords.length === 0) continue;

    const distributed = distributeWordsOverDuration(segWords, segment.start, segment.end);
    allWords.push(...distributed);
  }

  return allWords;
}

/**
 * Parse SRT content and estimate word timings from subtitle entries.
 */
function estimateWordTimingsFromSRT(srt: string): WordTimestamp[] {
  const allWords: WordTimestamp[] = [];

  // Parse SRT entries: "1\n00:00:00,000 --> 00:00:08,320\nText here\n"
  const entries = srt.trim().split(/\n\n+/);

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    if (lines.length < 3) continue;

    // Parse timestamp line: "00:00:00,000 --> 00:00:08,320"
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const start =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const end =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    // Join remaining lines as text
    const text = lines.slice(2).join(" ").trim();
    const segWords = text.split(/\s+/).filter((w) => w.length > 0);
    if (segWords.length === 0) continue;

    const distributed = distributeWordsOverDuration(segWords, start, end);
    allWords.push(...distributed);
  }

  return allWords;
}

/**
 * Distribute words over a time range proportionally by character length.
 * Longer words get more time. Adds a small gap between words.
 */
function distributeWordsOverDuration(
  words: string[],
  start: number,
  end: number
): WordTimestamp[] {
  if (words.length === 0) return [];

  const duration = end - start;
  if (duration <= 0) return [];

  // Calculate total character weight (longer words = more time)
  // Add 1 to each word length to avoid zero-length words getting zero time
  const weights = words.map((w) => w.length + 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const result: WordTimestamp[] = [];
  let currentTime = start;

  for (let i = 0; i < words.length; i++) {
    const wordDuration = (weights[i] / totalWeight) * duration;
    const wordEnd = i === words.length - 1 ? end : currentTime + wordDuration;

    result.push({
      word: words[i],
      start: Math.round(currentTime * 1000) / 1000,
      end: Math.round(wordEnd * 1000) / 1000,
    });

    currentTime = wordEnd;
  }

  return result;
}

/**
 * Poll for async result if WaveSpeed returns a processing/created status.
 */
async function pollForResult(
  apiKey: string,
  pollUrl: string,
  taskId?: string
): Promise<Record<string, unknown> | null> {
  const url = pollUrl.startsWith("http")
    ? pollUrl
    : `https://api.wavespeed.ai/api/v3/predictions/${taskId || pollUrl}/result`;

  const maxAttempts = 30;
  const intervalMs = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) continue;

      const result = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultStatus = (result as any)?.data?.status || (result as any)?.status;

      if (resultStatus === "completed") {
        return result as Record<string, unknown>;
      }
      if (resultStatus === "failed") {
        console.error("WaveSpeed Whisper polling failed:", JSON.stringify(result));
        return null;
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }

  console.error("WaveSpeed Whisper polling timed out after 90s");
  return null;
}
