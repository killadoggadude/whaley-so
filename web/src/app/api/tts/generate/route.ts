import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

// ----- Audio Tag Injection for Eleven v3 -----
// Eleven v3 supports inline audio tags like [flirty], [whispers], [giggles]
// that control vocal delivery without being spoken aloud.

/**
 * Map of sentence-ending patterns to appropriate audio tags.
 * Tags are matched against lowercased sentence text.
 */
const TONE_PATTERNS: { patterns: RegExp[]; tags: string[] }[] = [
  // Questions — curious / playful
  {
    patterns: [/\?$/],
    tags: ["[curious]", "[playfully]", "[teasingly]"],
  },
  // Exclamations — excited / enthusiastic
  {
    patterns: [/!$/],
    tags: ["[excited]", "[enthusiastically]", "[energetically]"],
  },
  // Flirty / intimate keywords
  {
    patterns: [
      /\b(love|sexy|hot|baby|babe|darling|honey|sweetie|kiss|desire|miss you|want you|need you|thinking of you)\b/i,
    ],
    tags: ["[flirty]", "[seductively]", "[softly]", "[intimately]"],
  },
  // Naughty / teasing keywords
  {
    patterns: [
      /\b(naughty|bad|dirty|secret|forbidden|tease|dare|punish|spank)\b/i,
    ],
    tags: ["[naughty]", "[mischievously]", "[teasingly]", "[whispering]"],
  },
  // Laughing / fun keywords
  {
    patterns: [
      /\b(haha|lol|funny|hilarious|lmao|joke)\b/i,
      /😂|🤣|😆/,
    ],
    tags: ["[giggles]", "[laughing]", "[amused]"],
  },
  // Sad / emotional keywords
  {
    patterns: [
      /\b(sad|cry|miss|lonely|sorry|hurt|pain|broke my heart)\b/i,
    ],
    tags: ["[softly]", "[emotional]", "[tender]"],
  },
  // Whispering / secrets
  {
    patterns: [
      /\b(whisper|secret|between us|don'?t tell|just for you|only you)\b/i,
    ],
    tags: ["[whispers]", "[softly]", "[intimately]"],
  },
  // Confident / empowering
  {
    patterns: [
      /\b(confident|strong|powerful|queen|boss|slay|own it|amazing)\b/i,
    ],
    tags: ["[confidently]", "[boldly]", "[assertively]"],
  },
];

/**
 * Inject audio tags into text for ElevenLabs Eleven v3.
 * Analyzes each sentence's tone and prepends an appropriate tag.
 * Tags are distributed to avoid repetition and keep it natural.
 */
function injectAudioTags(text: string): string {
  // Split into sentences (keep the delimiter attached)
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!sentences || sentences.length === 0) return text;

  const usedTags = new Set<string>();
  let lastTag = "";

  const tagged = sentences.map((sentence, idx) => {
    const trimmed = sentence.trim();
    if (!trimmed) return sentence;

    // Find matching tone patterns
    let candidateTags: string[] = [];

    for (const rule of TONE_PATTERNS) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          candidateTags.push(...rule.tags);
          break;
        }
      }
    }

    // Remove duplicates
    candidateTags = [...new Set(candidateTags)];

    // Don't tag every sentence — skip some for natural flow
    // Tag ~60% of sentences, never two identical tags in a row
    if (candidateTags.length === 0) return sentence;
    if (idx > 0 && Math.random() > 0.6) return sentence;

    // Pick a tag that wasn't just used
    const availableTags = candidateTags.filter((t) => t !== lastTag);
    const finalTags =
      availableTags.length > 0 ? availableTags : candidateTags;

    // Prefer tags not yet used in the text for variety
    const freshTags = finalTags.filter((t) => !usedTags.has(t));
    const pickFrom = freshTags.length > 0 ? freshTags : finalTags;

    const tag = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    usedTags.add(tag);
    lastTag = tag;

    // Prepend the tag to the sentence
    return `${tag} ${trimmed}`;
  });

  return tagged.join(" ");
}

// ----- Main handler -----

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

    // Get user's ElevenLabs API key
    const apiKey = await getDecryptedKey("elevenlabs");
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { text, voice_id, settings, inject_tags } = body;

    if (!text || !voice_id) {
      return NextResponse.json(
        { error: "Text and voice ID are required" },
        { status: 400 }
      );
    }

    // Inject audio tags for more expressive delivery (default: on)
    const shouldInjectTags = inject_tags !== false;
    const processedText = shouldInjectTags ? injectAudioTags(text) : text;

    console.log(
      "[TTS] model: eleven_v3, voice:", voice_id,
      "tags:", shouldInjectTags,
      "textLen:", processedText.length
    );

    // Call ElevenLabs API with Eleven v3 (most expressive, supports audio tags)
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: processedText,
          model_id: "eleven_v3",
          voice_settings: {
            stability: settings?.stability ?? 0.5,
            similarity_boost: settings?.similarity_boost ?? 0.75,
            style: settings?.style ?? 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "ElevenLabs API error";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage =
          errorJson.detail?.message || errorJson.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Stream audio back to client
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate audio",
      },
      { status: 500 }
    );
  }
}
