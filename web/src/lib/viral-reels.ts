/**
 * Extract shortcode from an Instagram reel/post URL.
 * Supports:
 *   https://www.instagram.com/reel/ABC123/
 *   https://www.instagram.com/p/ABC123/
 *   https://www.instagram.com/username/reel/ABC123/
 *   https://www.instagram.com/reel/ABC123/?igsh=...
 */
export function extractInstagramShortcode(url: string): string | null {
  const match = url.match(
    /instagram\.com\/(?:[^/]+\/)?(?:reel|p)\/([A-Za-z0-9_-]+)/
  );
  return match ? match[1] : null;
}

/**
 * Detect platform from URL.
 */
export function detectPlatform(
  url: string
): "instagram" | "tiktok" | "youtube" | null {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return null;
}

/**
 * Validate that a URL is a valid Instagram reel or post.
 * Supports both direct (/reel/X) and profile-prefixed (/user/reel/X) formats.
 */
export function isValidInstagramReelUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\/([^/]+\/)?(reel|p)\/[A-Za-z0-9_-]+/.test(
    url
  );
}
