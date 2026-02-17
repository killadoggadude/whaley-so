import { NextRequest, NextResponse } from "next/server";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/**
 * Proxy reel thumbnails to avoid CORS/redirect issues.
 *
 * Instagram: GET /api/viral-reels/thumbnail?shortcode=ABC123
 * TikTok:    GET /api/viral-reels/thumbnail?platform=tiktok&url=https://...
 * YouTube:   GET /api/viral-reels/thumbnail?platform=youtube&url=https://...
 */
export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform") || "instagram";
  const shortcode = request.nextUrl.searchParams.get("shortcode");
  const url = request.nextUrl.searchParams.get("url");

  try {
    let imageResponse: Response | null = null;

    if (platform === "instagram") {
      if (!shortcode || !/^[A-Za-z0-9_-]+$/.test(shortcode)) {
        return NextResponse.json({ error: "Invalid shortcode" }, { status: 400 });
      }

      // Fetch the reel page as Googlebot to extract og:image
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
        const ogMatch = html.match(/"og:image"\s*[^>]*content="([^"]+)"/) ||
                        html.match(/property="og:image"\s*content="([^"]+)"/);

        if (ogMatch) {
          const imgUrl = ogMatch[1].replace(/&amp;/g, "&");
          imageResponse = await fetch(imgUrl, {
            headers: { "User-Agent": BROWSER_UA },
            redirect: "follow",
          });
        }
      }
    } else if (platform === "tiktok") {
      if (!url) {
        return NextResponse.json({ error: "URL required for TikTok" }, { status: 400 });
      }

      // Use TikTok oEmbed to get thumbnail URL
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const oembedRes = await fetch(oembedUrl, {
        headers: { "User-Agent": BROWSER_UA },
      });

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.thumbnail_url) {
          imageResponse = await fetch(data.thumbnail_url, {
            headers: { "User-Agent": BROWSER_UA },
          });
        }
      }
    } else if (platform === "youtube") {
      if (!url) {
        return NextResponse.json({ error: "URL required for YouTube" }, { status: 400 });
      }

      // Extract video ID
      const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
      const longMatch = url.match(
        /youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/
      );
      const videoId = shortMatch?.[1] || longMatch?.[1];

      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }

      // Try maxresdefault, then hqdefault
      for (const size of ["maxresdefault", "hqdefault"]) {
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/${size}.jpg`;
        const res = await fetch(thumbUrl);
        if (res.ok) {
          imageResponse = res;
          break;
        }
      }
    } else {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    if (!imageResponse || !imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: 502 });
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image response" }, { status: 502 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: 500 });
  }
}
