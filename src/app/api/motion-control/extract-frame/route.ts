import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp, access } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const maxDuration = 60;

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

  throw new Error("FFmpeg binary not found. Searched: " + candidates.join(", "));
}

/**
 * Extract the first frame of a video using FFmpeg.
 * Returns the frame as a JPEG buffer.
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

    // 1. Download the video
    console.log("[ExtractFrame] Downloading video...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download video: ${videoResponse.status}` },
        { status: 500 }
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";
    const ext = contentType.includes("webm") ? "webm" : "mp4";

    // 2. Extract first frame with FFmpeg
    tempDir = await mkdtemp(join(tmpdir(), "motion-frame-"));
    const inputPath = join(tempDir, `input.${ext}`);
    const outputPath = join(tempDir, "frame.jpg");

    await writeFile(inputPath, videoBuffer);

    const ffmpegBinary = await getFFmpegPath();
    await extractFirstFrame(ffmpegBinary, inputPath, outputPath);

    const frameBuffer = await readFile(outputPath);

    // 3. Upload frame to Supabase storage
    const uuid = crypto.randomUUID();
    const filename = `motion-frame_${uuid.slice(0, 8)}.jpg`;
    const filePath = `${user.id}/image/${uuid}_${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, frameBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 4. Get signed URL for the frame
    const { data: urlData } = await supabase.storage
      .from("assets")
      .createSignedUrl(filePath, 3600);

    if (!urlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create signed URL for frame" },
        { status: 500 }
      );
    }

    console.log("[ExtractFrame] Frame extracted and uploaded:", filePath);

    return NextResponse.json({
      frameUrl: urlData.signedUrl,
      filePath,
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
