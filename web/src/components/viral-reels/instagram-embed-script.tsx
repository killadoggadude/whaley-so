"use client";

/**
 * Get Instagram thumbnail URL from a reel/post URL.
 * Uses our server-side proxy to avoid CORS / redirect issues.
 * The proxy fetches from Instagram's CDN and returns the image bytes.
 */
export function getInstagramThumbnailUrl(url: string): string {
  // Extract shortcode from various URL formats
  const match = url.match(
    /instagram\.com\/(?:[^/]+\/)?(?:reel|p)\/([A-Za-z0-9_-]+)/
  );
  if (!match) return "";
  return `/api/viral-reels/thumbnail?shortcode=${match[1]}`;
}
