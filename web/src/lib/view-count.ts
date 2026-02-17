import { extractInstagramShortcode } from "@/lib/viral-reels";
import type { ReelPlatform } from "@/types";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/**
 * Fetch view count for a reel across different platforms.
 *
 * Instagram strategy (for OTHER people's public reels):
 *   1. Try scraping the reel page as Googlebot for og:description with view counts
 *   2. Try Instagram oEmbed endpoint for any view count fields
 *   3. Return 0 if all methods fail
 *
 * Note: Instagram Graph API only returns view_count for media YOU own.
 * Since viral reels are from other creators, we use web scraping.
 *
 * @param url Reel URL
 * @param platform Platform type
 * @returns View count or 0 if fetching fails
 */
export async function fetchViewCount(
  url: string,
  platform: ReelPlatform
): Promise<number> {
  switch (platform) {
    case "instagram":
      return fetchInstagramViewCount(url);
    case "tiktok":
      return fetchTikTokViewCount(url);
    case "youtube":
      return fetchYouTubeViewCount(url);
    default:
      return 0;
  }
}

/**
 * Fetch Instagram view count by scraping the reel page.
 *
 * Strategy:
 * 1. Fetch reel page as Googlebot (gets pre-rendered HTML with meta tags)
 * 2. Parse og:description or JSON-LD for view/play counts
 * 3. Fallback to oEmbed endpoint
 *
 * Instagram embeds view counts in meta tags for search engines, e.g.:
 * <meta property="og:description" content="123K likes, 456 comments - ..." />
 * or in JSON-LD structured data with interactionStatistic
 */
async function fetchInstagramViewCount(url: string): Promise<number> {
  const shortcode = extractInstagramShortcode(url);
  if (!shortcode) return 0;

  // Method 1: Scrape the reel page as Googlebot
  try {
    const pageUrl = `https://www.instagram.com/reel/${shortcode}/`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": GOOGLEBOT_UA,
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Try to find view count in interactionStatistic JSON-LD
      // Instagram sometimes includes: "interactionStatistic":{"@type":"InteractionCounter","interactionType":"http://schema.org/WatchAction","userInteractionCount":"123456"}
      const watchMatch = html.match(
        /userInteractionCount["']?\s*[:=]\s*["']?(\d[\d,]*)/i
      );
      if (watchMatch) {
        const count = parseInt(watchMatch[1].replace(/,/g, ""), 10);
        if (count > 0) {
          console.log(`[View Count] Instagram scrape found: ${count} views for ${shortcode}`);
          return count;
        }
      }

      // Try to find "X plays" or "X views" in og:description or page content
      const viewPatterns = [
        /(\d[\d,.]*[KMB]?)\s*(?:views|plays|Aufrufe)/i,
        /video_view_count["']?\s*[:=]\s*["']?(\d[\d,]*)/i,
        /play_count["']?\s*[:=]\s*["']?(\d[\d,]*)/i,
        /"view_count"\s*:\s*(\d+)/i,
      ];

      for (const pattern of viewPatterns) {
        const match = html.match(pattern);
        if (match) {
          const count = parseFormattedNumber(match[1]);
          if (count > 0) {
            console.log(`[View Count] Instagram pattern found: ${count} views for ${shortcode}`);
            return count;
          }
        }
      }
    }
  } catch (error) {
    console.warn("[View Count] Instagram page scrape failed:", error);
  }

  // Method 2: Try oEmbed endpoint
  return await fetchInstagramViewCountOEmbed(url);
}

/**
 * Parse formatted numbers like "123K", "1.2M", "456,789", "1B"
 */
function parseFormattedNumber(str: string): number {
  if (!str) return 0;

  const cleaned = str.replace(/,/g, "").trim();

  // Handle suffixes: K, M, B
  const suffixMatch = cleaned.match(/^(\d+\.?\d*)\s*([KMB])$/i);
  if (suffixMatch) {
    const num = parseFloat(suffixMatch[1]);
    const suffix = suffixMatch[2].toUpperCase();
    switch (suffix) {
      case "K":
        return Math.round(num * 1_000);
      case "M":
        return Math.round(num * 1_000_000);
      case "B":
        return Math.round(num * 1_000_000_000);
    }
  }

  // Plain number
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Attempt to fetch Instagram view count from oEmbed endpoint.
 * Note: Instagram oEmbed doesn't consistently return view counts.
 * This is a best-effort fallback.
 */
async function fetchInstagramViewCountOEmbed(url: string): Promise<number> {
  try {
    const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": BROWSER_UA },
    });

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();

    // Try to extract view count from various possible fields
    const viewCount =
      data.view_count ||
      data.video_view_count ||
      data.play_count ||
      0;

    return typeof viewCount === "number" ? viewCount : 0;
  } catch (error) {
    console.warn("[View Count] Instagram oEmbed failed:", error);
    return 0;
  }
}

/**
 * Fetch TikTok view count using oEmbed API.
 * TikTok oEmbed doesn't expose per-video view counts.
 * Would need official TikTok API for accurate counts.
 */
async function fetchTikTokViewCount(url: string): Promise<number> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      headers: { "User-Agent": BROWSER_UA },
    });

    if (!response.ok) {
      return 0;
    }

    // TikTok oEmbed doesn't expose view counts in public API
    // Would need official TikTok for Developers API
    return 0;
  } catch (error) {
    console.warn("[View Count] TikTok oEmbed failed:", error);
    return 0;
  }
}

/**
 * Fetch YouTube view count using YouTube Data API v3.
 * Requires YOUTUBE_API_KEY in environment variables.
 */
async function fetchYouTubeViewCount(url: string): Promise<number> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return 0;
  }

  try {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return 0;

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error("[View Count] YouTube API failed:", await response.text());
      return 0;
    }

    const data = await response.json();
    const viewCount = data.items?.[0]?.statistics?.viewCount;

    return viewCount ? parseInt(viewCount, 10) : 0;
  } catch (error) {
    console.error("[View Count] YouTube API error:", error);
    return 0;
  }
}

/**
 * Extract YouTube video ID from various URL formats.
 */
function extractYouTubeVideoId(url: string): string | null {
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  const longMatch = url.match(
    /youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/
  );
  if (longMatch) return longMatch[1];

  return null;
}

/**
 * Format view count for display (123K, 1.2M, etc.)
 */
export function formatViewCount(count: number): string {
  if (count === 0) return "0";
  if (count < 1000) return count.toString();
  if (count < 1_000_000) {
    const val = count / 1000;
    return val >= 100 ? `${Math.round(val)}K` : `${val.toFixed(1)}K`;
  }
  const val = count / 1_000_000;
  return val >= 100 ? `${Math.round(val)}M` : `${val.toFixed(1)}M`;
}
