import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp, access } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const maxDuration = 120; // 2 min for FFmpeg stream-copy

/**
 * Get the ffmpeg binary path. Turbopack rewrites require() paths,
 * so we resolve the path manually from process.cwd().
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
 * Strip metadata and inject fake iPhone 14 metadata using FFmpeg.
 * Uses stream copy (no re-encode) so it's near-instant.
 */
function stripAndInjectMetadata(
  ffmpegBinary: string,
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      inputPath,
      "-c",
      "copy",
      // Strip all existing metadata
      "-map_metadata",
      "-1",
      // Inject fake iPhone 14 metadata
      "-metadata",
      "com.apple.quicktime.make=Apple",
      "-metadata",
      "com.apple.quicktime.model=iPhone 14",
      "-metadata",
      "com.apple.quicktime.software=17.4.1",
      "-metadata",
      "com.apple.quicktime.creationdate=" + new Date().toISOString(),
      "-metadata",
      "encoder=Apple iPhone 14",
      "-metadata",
      "creation_time=" + new Date().toISOString(),
      "-y",
      outputPath,
    ];

    console.log("Running FFmpeg (metadata strip):", ffmpegBinary, args.join(" "));

    execFile(
      ffmpegBinary,
      args,
      { timeout: 60000 }, // 1 min timeout (stream copy is fast)
      (error, _stdout, stderr) => {
        if (error) {
          console.error("FFmpeg metadata strip error:", error.message);
          console.error("FFmpeg stderr:", stderr);
          reject(new Error(`FFmpeg metadata strip failed: ${error.message}`));
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

    // 1. Download video from WaveSpeed CDN
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download video: ${videoResponse.status}` },
        { status: 500 }
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const mimeType =
      videoResponse.headers.get("content-type") || "video/mp4";
    const ext = mimeType.includes("webm") ? "webm" : "mp4";

    // 2. Strip AI metadata and inject iPhone 14 metadata via FFmpeg
    tempDir = await mkdtemp(join(tmpdir(), "dancing-reel-meta-"));
    const inputPath = join(tempDir, `input.${ext}`);
    const outputPath = join(tempDir, `output.${ext}`);

    await writeFile(inputPath, videoBuffer);

    const ffmpegBinary = await getFFmpegPath();
    await stripAndInjectMetadata(ffmpegBinary, inputPath, outputPath);

    const processedBuffer = await readFile(outputPath);

    // 3. Upload to Supabase Storage
    const uuid = crypto.randomUUID();
    const filename = `dancing-reel_${uuid.slice(0, 8)}.${ext}`;
    const filePath = `${user.id}/video/${uuid}_${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, processedBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 4. Create asset record
    const { data: asset, error: dbError } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        filename,
        file_path: filePath,
        file_type: "video",
        mime_type: mimeType,
        file_size: processedBuffer.byteLength,
        tags: ["dancing-reel", "dance", "wavespeed", "kling"],
        metadata: {
          source: "dancing-reel",
          original_url: videoUrl,
        },
      })
      .select("id")
      .single();

    if (dbError) {
      // Rollback: remove uploaded file
      await supabase.storage.from("assets").remove([filePath]);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ assetId: asset.id }, { status: 201 });
  } catch (error) {
    console.error("Dancing reel save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save video",
      },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    if (tempDir) {
      try {
        const files = ["input.mp4", "input.webm", "output.mp4", "output.webm"];
        for (const f of files) {
          try {
            await unlink(join(tempDir, f));
          } catch {
            // File may not exist
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
