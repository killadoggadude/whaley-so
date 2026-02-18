import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp, access } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const maxDuration = 120; // Allow more time for Instagram resolution + download + FFmpeg

/**
 * Get the ffmpeg binary path.
 */
async function getFFmpegPath(): Promise<string> {
  const candidates = [
    join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    join(process.cwd(), "..", "node_modules", "ffmpeg-static", "ffmpeg"),
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "ffmpeg",
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Not found, try next
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("ffmpeg-static");
    if (path) return path;
  } catch {
    // Ignore
  }

  throw new Error(
    "FFmpeg binary not found. Searched: " + candidates.join(", ")
  );
}

/**
 * Check if a URL is a social media page URL (not a direct video file).
 */
function isSocialMediaUrl(url: string): boolean {
  return (
    url.includes("instagram.com") ||
    url.includes("instagr.am") ||
    url.includes("tiktok.com")
  );
}

/**
 * Resolve an Instagram reel/post URL to a direct .mp4 video URL.
 * Fetches the page HTML and extracts the og:video:secure_url meta tag.
 */
async function resolveInstagramVideoUrl(url: string): Promise<string> {
  console.log("[ExtractFrame] Resolving Instagram URL:", url);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram page: HTTP ${response.status}`);
  }

  const html = await response.text();

  // Try og:video:secure_url first (most reliable)
  let match = html.match(
    /og:video:secure_url"\s*content="([^"]+)"/
  );
  if (!match) {
    // Try og:video
    match = html.match(/og:video"\s*content="([^"]+)"/);
  }

  if (!match || !match[1]) {
    throw new Error(
      "Could not find video URL in Instagram page. The reel may be private or the URL may be invalid."
    );
  }

  // Decode HTML entities (Instagram uses &amp; for &)
  const directUrl = match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  console.log(
    "[ExtractFrame] Resolved Instagram video URL:",
    directUrl.slice(0, 120) + "..."
  );

  return directUrl;
}

/**
 * Resolve a TikTok URL to a direct video URL.
 * TikTok embeds have og:video meta tags too.
 */
async function resolveTikTokVideoUrl(url: string): Promise<string> {
  console.log("[ExtractFrame] Resolving TikTok URL:", url);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch TikTok page: HTTP ${response.status}`);
  }

  const html = await response.text();

  // Try multiple patterns for TikTok
  let match = html.match(
    /og:video:secure_url"\s*content="([^"]+)"/
  );
  if (!match) {
    match = html.match(/og:video"\s*content="([^"]+)"/);
  }
  if (!match) {
    // TikTok sometimes has downloadAddr in JSON
    match = html.match(/"downloadAddr":"([^"]+)"/);
  }

  if (!match || !match[1]) {
    throw new Error(
      "Could not find video URL in TikTok page. The video may be private or the URL may be invalid."
    );
  }

  const directUrl = match[1]
    .replace(/&amp;/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/");

  console.log(
    "[ExtractFrame] Resolved TikTok video URL:",
    directUrl.slice(0, 120) + "..."
  );

  return directUrl;
}

/**
 * Resolve a social media URL to a direct video URL.
 */
async function resolveVideoUrl(url: string): Promise<string> {
  if (url.includes("instagram.com") || url.includes("instagr.am")) {
    return resolveInstagramVideoUrl(url);
  }
  if (url.includes("tiktok.com")) {
    return resolveTikTokVideoUrl(url);
  }
  // Not a social media URL — assume it's already a direct video URL
  return url;
}

/**
 * Extract the first frame of a video using FFmpeg.
 */
function extractFirstFrame(
  ffmpegBinary: string,
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-q:v",
      "2", // High quality JPEG
      "-y",
      outputPath,
    ];

    console.log("[ExtractFrame] Running FFmpeg:", args.join(" "));

    execFile(
      ffmpegBinary,
      args,
      { timeout: 30000 },
      (error, _stdout, stderr) => {
        if (error) {
          console.error("[ExtractFrame] FFmpeg error:", error.message);
          console.error("[ExtractFrame] FFmpeg stderr:", stderr);
          reject(new Error(`FFmpeg frame extraction failed: ${error.message}`));
        } else {
          resolve();
        }
      }
    );
  });
}

export async function POST(request: Request) {
  let tempDir: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoUrl } = body as { videoUrl?: string };

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 }
      );
    }

    // 1. Resolve social media URLs to direct video URLs
    let directVideoUrl = videoUrl;
    if (isSocialMediaUrl(videoUrl)) {
      try {
        directVideoUrl = await resolveVideoUrl(videoUrl);
      } catch (resolveError) {
        return NextResponse.json(
          {
            error:
              resolveError instanceof Error
                ? resolveError.message
                : "Failed to resolve video URL. Try uploading the video directly instead.",
          },
          { status: 400 }
        );
      }
    }

    // 2. Download the actual video file
    console.log("[ExtractFrame] Downloading video...");
    const videoResponse = await fetch(directVideoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    });

    if (!videoResponse.ok) {
      return NextResponse.json(
        {
          error: `Failed to download video: HTTP ${videoResponse.status}. Try uploading the video directly.`,
        },
        { status: 500 }
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const contentType =
      videoResponse.headers.get("content-type") || "video/mp4";

    // Verify we actually got a video file (not an HTML page)
    if (
      contentType.includes("text/html") ||
      videoBuffer.length < 5000
    ) {
      return NextResponse.json(
        {
          error:
            "The URL did not return a valid video file. Try uploading the video directly instead.",
        },
        { status: 400 }
      );
    }

    const ext = contentType.includes("webm") ? "webm" : "mp4";

    console.log(
      `[ExtractFrame] Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB video (${contentType})`
    );

    // 3. Upload the video to Supabase so we have a stable URL for the motion control step
    const videoUuid = crypto.randomUUID();
    const videoFilename = `motion-ref_${videoUuid.slice(0, 8)}.${ext}`;
    const videoFilePath = `${user.id}/video/${videoUuid}_${videoFilename}`;

    const { error: videoUploadError } = await supabase.storage
      .from("assets")
      .upload(videoFilePath, videoBuffer, {
        contentType: contentType.includes("video") ? contentType : "video/mp4",
        upsert: false,
      });

    if (videoUploadError) {
      console.error(
        "[ExtractFrame] Video upload error:",
        videoUploadError.message
      );
      // Non-fatal: we can still extract the frame, just won't have a stable video URL
    }

    // Get signed URL for the uploaded video
    let stableVideoUrl: string | null = null;
    if (!videoUploadError) {
      const { data: videoUrlData } = await supabase.storage
        .from("assets")
        .createSignedUrl(videoFilePath, 3600);
      stableVideoUrl = videoUrlData?.signedUrl || null;
    }

    // 4. Extract first frame with FFmpeg
    tempDir = await mkdtemp(join(tmpdir(), "motion-frame-"));
    const inputPath = join(tempDir, `input.${ext}`);
    const outputPath = join(tempDir, "frame.jpg");

    await writeFile(inputPath, videoBuffer);

    const ffmpegBinary = await getFFmpegPath();
    await extractFirstFrame(ffmpegBinary, inputPath, outputPath);

    const frameBuffer = await readFile(outputPath);

    // 5. Upload frame to Supabase storage
    const frameUuid = crypto.randomUUID();
    const frameFilename = `motion-frame_${frameUuid.slice(0, 8)}.jpg`;
    const frameFilePath = `${user.id}/image/${frameUuid}_${frameFilename}`;

    const { error: frameUploadError } = await supabase.storage
      .from("assets")
      .upload(frameFilePath, frameBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (frameUploadError) {
      return NextResponse.json(
        { error: `Frame upload failed: ${frameUploadError.message}` },
        { status: 500 }
      );
    }

    // 6. Get signed URL for the frame
    const { data: frameUrlData } = await supabase.storage
      .from("assets")
      .createSignedUrl(frameFilePath, 3600);

    if (!frameUrlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create signed URL for frame" },
        { status: 500 }
      );
    }

    console.log("[ExtractFrame] Frame extracted and uploaded:", frameFilePath);

    return NextResponse.json({
      frameUrl: frameUrlData.signedUrl,
      // Return the stable video URL so the frontend can use it for motion control
      // (instead of the original Instagram URL which won't work as a direct video)
      resolvedVideoUrl: stableVideoUrl || directVideoUrl,
      filePath: frameFilePath,
      fileSize: frameBuffer.length,
    });
  } catch (error) {
    console.error("Extract frame error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract frame",
      },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    if (tempDir) {
      try {
        const files = ["input.mp4", "input.webm", "frame.jpg"];
        for (const f of files) {
          try {
            await unlink(join(tempDir, f));
          } catch {
            // May not exist
          }
        }
        const { rmdir } = await import("fs/promises");
        await rmdir(tempDir);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}
