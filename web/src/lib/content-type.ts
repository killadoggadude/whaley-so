import type { ReelPlatform } from "@/types";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

export type ContentType = "talking_head" | "dancing";

// Keywords that indicate talking head content (voiceover, storytelling, tutorials)
const TALKING_KEYWORDS = [
  "tutorial", "how to", "speaking", "talking", "explains",
  "interview", "story", "storytime", "advice", "tips",
  "reaction", "review", "vlog", "podcast", "rant",
  "opinion", "grwm", "get ready with me", "q&a",
  "unboxing", "haul", "makeup", "skincare",
  "motivation", "affirmation", "pov",
];

// Keywords that indicate dancing content
const DANCING_KEYWORDS = [
  "dance", "choreography", "choreo", "moves", "dancing",
  "trend", "challenge", "transition", "lip sync", "lipsync",
  "trending audio", "viral dance",
];

/**
 * Detect content type for a reel (Talking Head vs Dancing).
 *
 * Strategy: Use oEmbed or page scraping to get title/caption,
 * then analyze keywords. Default to "talking_head" since most
 * viral OFM content is talking/storytelling.
 */
export async function detectContentType(
  url: string,
  platform: ReelPlatform
): Promise<ContentType | null> {
  switch (platform) {
    case "instagram":
      return detectInstagramContentType(url);
    case "tiktok":
      return detectTikTokContentType(url);
    case "youtube":
      return detectYouTubeContentType(url);
    default:
      return null;
  }
}

/**
 * Classify text as talking_head or dancing based on keyword analysis.
 */
function classifyText(text: string): ContentType {
  const lower = text.toLowerCase();

  const talkingScore = TALKING_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const dancingScore = DANCING_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  if (dancingScore > talkingScore) return "dancing";
  if (talkingScore > 0) return "talking_head";

  // Default: talking_head (most OFM viral content is talking/storytelling)
  return "talking_head";
}

/**
 * Detect Instagram content type using oEmbed + page scraping.
 */
async function detectInstagramContentType(
  url: string
): Promise<ContentType | null> {
  // Method 1: Try oEmbed for title/caption
  try {
    const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": BROWSER_UA },
    });

    if (response.ok) {
      const data = await response.json();
      const title = data.title || "";
      const authorName = data.author_name || "";
      const text = `${title} ${authorName}`;

      if (text.trim().length > 5) {
        return classifyText(text);
      }
    }
  } catch {
    // oEmbed failed, try scraping
  }

  // Method 2: Scrape page as Googlebot for og:description
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": GOOGLEBOT_UA,
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Extract og:description
      const descMatch =
        html.match(/property="og:description"\s*content="([^"]+)"/) ||
        html.match(/"og:description"\s*[^>]*content="([^"]+)"/);

      if (descMatch) {
        return classifyText(descMatch[1]);
      }
    }
  } catch {
    // Scraping failed
  }

  // Default
  return "talking_head";
}

/**
 * Detect TikTok content type using oEmbed metadata.
 */
async function detectTikTokContentType(url: string): Promise<ContentType | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": BROWSER_UA },
    });

    if (!response.ok) return "talking_head";

    const data = await response.json();
    const title = data.title || "";

    return classifyText(title);
  } catch {
    return "talking_head";
  }
}

/**
 * Detect YouTube content type using YouTube Data API or oEmbed.
 */
async function detectYouTubeContentType(url: string): Promise<ContentType | null> {
  // Try YouTube oEmbed (no API key needed)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": BROWSER_UA },
    });

    if (!response.ok) return "talking_head";

    const data = await response.json();
    const title = data.title || "";

    return classifyText(title);
  } catch {
    return "talking_head";
  }
}
