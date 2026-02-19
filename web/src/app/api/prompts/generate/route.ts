import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecryptedKey } from "@/lib/api-keys";

const SYSTEM_PROMPT = `you are the worlds best ai prompt engineer and prompt expert
I want to recreate this image
analyse this image and give it to me in this format:

Subject details: This person is wearing a deep red, ribbed tube top with a horizontally striped texture. A thin, dark blue strap, likely from a shoulder bag, is visible crossing the subject's left shoulder and upper chest. A small, round, pearl-like stud earring is visible on the subject's right earlobe. The subject is posed from the chest up, slightly angled with the body turned gently to the right, and the head facing more directly towards the camera. The left shoulder is slightly forward, and the right shoulder reveals a subtle strap detail with a small tied loop. The person is posing for the camera with a serious or neutral expression. A section of dark hair falls across the subject's face, partially obscuring the left eye.
The scene: The scene is an outdoor, tropical beach setting during dusk or early evening. The environment features a wide expanse of light, off-white sandy beach that fills the foreground and extends into the midground. Numerous tall palm trees with lush green fronds are scattered across the midground and background, silhouetted against the twilight sky. Behind the palm trees, there are several multi-story buildings, likely resorts or restaurants, with many windows and facades illuminated by warm, artificial lights. Various people, appearing as blurred figures, are visible walking and standing on the sandy beach in the midground, near the illuminated buildings, suggesting a lively evening atmosphere. The setting is outdoor, with the subject in the immediate foreground, the beach and people in the midground, and the palm trees and buildings forming the distant background.
Lighting: The lighting is natural ambient light from the sky, characteristic of dusk or early evening, creating a soft, diffused glow. There are also numerous artificial light sources emanating from the buildings in the background, casting warm, yellow-orange light. The light is predominantly soft, with subtle, long shadows barely visible on the subject, consistent with a low sun or twilight. The color temperature is warm overall, with cool undertones from the sky blending with the warm artificial lights.
Camera: The camera angle is slightly low, looking slightly upward towards the subject and the horizon. The perspective is a close-up on the subject, giving a personal, selfie-like feel. There is a shallow depth of field, with the subject in sharp focus and the background rendered in a soft, pleasing blur (bokeh effect). The focal distance is close to the subject. The composition places the subject prominently in the left half of the frame, balanced by the expansive beach and background elements on the right.
Atmosphere: The atmosphere is tranquil, relaxed, and inviting, conveying a sense of a pleasant tropical evening. The gentle twilight sky and warm lights from the background buildings contribute to a peaceful and slightly romantic ambiance. The weather appears clear and calm, with no visible environmental effects.
Colors and textures: The dominant colors in the scene include the deep red of the subject's top, the soft blues, purples, and pinks of the twilight sky, the dark greens of the palm fronds, the light beige and off-white of the sandy beach, and the warm yellows and oranges from the artificial lights in the background. Textures include the distinct vertical ribbing of the subject's top, the fine, granular texture of the sand, and the rough texture of palm tree trunks.
Technical quality: The image exhibits high-resolution quality with sharp focus on the subject. The photography is professional-looking, with good exposure and a pleasing aesthetic, typical of well-executed casual photography.`;

type Provider = "openai" | "anthropic";

// ----- Anthropic (Claude) -----
async function callAnthropic(
  apiKey: string,
  imageBase64: string,
  contentType: string,
  userMessage: string
): Promise<{ prompt?: string; error?: string; status?: number }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: userMessage,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "Anthropic API error";
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage =
        errorJson.error?.message || errorJson.error?.type || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    return { error: errorMessage, status: response.status };
  }

  const data = await response.json();
  const textContent = data.content?.find(
    (block: { type: string }) => block.type === "text"
  );

  if (!textContent?.text) {
    return { error: "No text response from Claude", status: 500 };
  }

  return { prompt: textContent.text.trim() };
}

// ----- OpenAI (GPT-4o) -----
async function callOpenAI(
  apiKey: string,
  imageBase64: string,
  contentType: string,
  userMessage: string
): Promise<{ prompt?: string; error?: string; status?: number }> {
  const dataUrl = `data:${contentType};base64,${imageBase64}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: userMessage,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "OpenAI API error";
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    return { error: errorMessage, status: response.status };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return { error: "No text response from OpenAI", status: 500 };
  }

  return { prompt: content.trim() };
}

// ----- Route Handler -----
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

    const body = await request.json();
    const {
      provider = "openai",
      image_base64,
      content_type,
      custom_instructions,
    } = body as {
      provider?: Provider;
      image_base64?: string;
      content_type?: string;
      custom_instructions?: string;
    };

    // Validate provider
    if (provider !== "openai" && provider !== "anthropic") {
      return NextResponse.json(
        { error: "Invalid provider. Use 'openai' or 'anthropic'." },
        { status: 400 }
      );
    }

    // Get the appropriate API key
    const apiKey = await getDecryptedKey(provider);
    if (!apiKey) {
      const label = provider === "openai" ? "OpenAI" : "Anthropic";
      return NextResponse.json(
        { error: `${label} API key not configured. Add it in Settings.` },
        { status: 400 }
      );
    }

    if (!image_base64 || !content_type) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Build the user message
    let userMessage =
      "analyse this image and give it to me in the format shown above";
    if (custom_instructions) {
      userMessage += `\n\n${custom_instructions}`;
    }

    // Call the selected provider
    const result =
      provider === "openai"
        ? await callOpenAI(apiKey, image_base64, content_type, userMessage)
        : await callAnthropic(apiKey, image_base64, content_type, userMessage);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({ prompt: result.prompt });
  } catch (error) {
    console.error("Prompt generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate prompt",
      },
      { status: 500 }
    );
  }
}
