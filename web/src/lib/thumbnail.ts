import { extractInstagramShortcode } from "@/lib/viral-reels";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Googlebot UA gets pre-rendered HTML with og:image from Instagram
const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/**
 * Fetch Instagram thumbnail by scraping the og:image meta tag.
 * Instagram serves pre-rendered HTML with OG tags to search engine crawlers.
 * The old /media/ endpoint no longer works reliably for reels.
 */
async function fetchInstagramThumbnail(
  shortcode: string
): Promise<Buffer | null> {
  try {
    // Fetch the reel page as Googlebot to get og:image
    const pageUrl = `https://www.instagram.com/reel/${shortcode}/`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": GOOGLEBOT_UA,
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) return null;

    const html = await pageRes.text();

    // Extract og:image URL from meta tag
    const ogMatch = html.match(
      /"og:image"\s*[^>]*content="([^"]+)"/
    );
    if (!ogMatch) {
      // Try alternate format
      const altMatch = html.match(
        /property="og:image"\s*content="([^"]+)"/
      );
      if (!altMatch) return null;
      return fetchImageFromUrl(altMatch[1]);
    }

    return fetchImageFromUrl(ogMatch[1]);
  } catch {
    return null;
  }
}

/**
 * Fetch image bytes from a URL. Handles HTML entity decoding.
 */
async function fetchImageFromUrl(rawUrl: string): Promise<Buffer | null> {
  try {
    // Decode HTML entities (Instagram encodes & as &amp; in meta tags)
    const url = rawUrl.replace(/&amp;/g, "&");

    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
      redirect: "follow",
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Fetch TikTok thumbnail via the oEmbed API.
 * TikTok oEmbed returns a JSON with a `thumbnail_url` field.
 */
async function fetchTikTokThumbnail(url: string): Promise<Buffer | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": BROWSER_UA },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const thumbUrl = data.thumbnail_url;
    if (!thumbUrl) return null;

    const imgRes = await fetch(thumbUrl, {
      headers: { "User-Agent": BROWSER_UA },
    });

    if (!imgRes.ok) return null;

    const arrayBuffer = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Extract YouTube video ID from various URL formats.
 */
function extractYouTubeVideoId(url: string): string | null {
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const longMatch = url.match(
    /youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/
  );
  if (longMatch) return longMatch[1];

  return null;
}

/**
 * Fetch YouTube thumbnail via img.youtube.com.
 * Tries maxresdefault first, falls back to hqdefault.
 */
async function fetchYouTubeThumbnail(url: string): Promise<Buffer | null> {
  try {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;

    // Try maxresdefault first, then hqdefault
    const thumbUrls = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    ];

    for (const thumbUrl of thumbUrls) {
      const res = await fetch(thumbUrl);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.startsWith("image/")) {
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch thumbnail for a reel based on platform.
 * Returns image bytes or null if fetching fails.
 */
export async function fetchThumbnailForReel(
  url: string,
  platform: string,
  shortcode: string | null
): Promise<Buffer | null> {
  switch (platform) {
    case "instagram": {
      const sc = shortcode || extractInstagramShortcode(url);
      if (!sc) return null;
      return fetchInstagramThumbnail(sc);
    }
    case "tiktok":
      return fetchTikTokThumbnail(url);
    case "youtube":
      return fetchYouTubeThumbnail(url);
    default:
      return null;
  }
}

/**
 * Get the platform-specific thumbnail proxy URL (for live fallback).
 */
export function getThumbnailProxyUrl(
  url: string,
  platform: string,
  shortcode: string | null
): string {
  switch (platform) {
    case "instagram": {
      const sc = shortcode || extractInstagramShortcode(url);
      if (!sc) return "";
      return `/api/viral-reels/thumbnail?shortcode=${sc}`;
    }
    case "tiktok":
      return `/api/viral-reels/thumbnail?platform=tiktok&url=${encodeURIComponent(url)}`;
    case "youtube":
      return `/api/viral-reels/thumbnail?platform=youtube&url=${encodeURIComponent(url)}`;
    default:
      return "";
  }
}