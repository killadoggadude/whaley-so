import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp, access, copyFile, readdir } from "fs/promises";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { generateASS, generateASSFromCustom, getCaptionStyle } from "@/lib/caption-styles";
import type { CustomCaptionSettings } from "@/lib/caption-styles";
import type { WordTimestamp } from "@/types";

export const maxDuration = 300; // 5 min for FFmpeg processing

/**
 * Get the ffmpeg binary path. Turbopack rewrites require() paths,
 * so we resolve the path manually from process.cwd().
 */
async function getFFmpegPath(): Promise<string> {
  // Try the node_modules path relative to the project root
  const candidates = [
    join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    join(process.cwd(), "..", "node_modules", "ffmpeg-static", "ffmpeg"),
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "ffmpeg", // System PATH fallback
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Not found, try next
    }
  }

  // Last resort: try require (may work in non-Turbopack contexts)
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
 * POST /api/talking-head/add-captions
 * Burns ASS subtitles into a video using FFmpeg.
 *
 * Body: { videoUrl: string, words: WordTimestamp[], customSettings?: CustomCaptionSettings, styleId?: string }
 * Accepts either customSettings (new) or styleId (legacy). customSettings takes priority.
 * Returns: { assetId: string, signedUrl: string }
 */
export async function POST(request: Request) {
  let tempDir: string | null = null;

  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoUrl, words, customSettings, styleId } = body as {
      videoUrl?: string;
      words?: WordTimestamp[];
      customSettings?: CustomCaptionSettings;
      styleId?: string;
    };

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 }
      );
    }

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { error: "words array with timestamps is required" },
        { status: 400 }
      );
    }

    if (!customSettings && !styleId) {
      return NextResponse.json(
        { error: "Either customSettings or styleId is required" },
        { status: 400 }
      );
    }

    // Create temp directory for this job
    tempDir = await mkdtemp(join(tmpdir(), "caption-"));
    const inputPath = join(tempDir, "input.mp4");
    const assPath = join(tempDir, "subs.ass");
    const outputPath = join(tempDir, "output.mp4");
    const fontDir = join(tempDir, "fonts");

    // Copy bundled fonts to temp directory so FFmpeg's ass filter can find them
    // (Vercel serverless has no system fonts installed)
    const projectFontsDir = join(process.cwd(), "fonts");
    try {
      const { mkdir } = await import("fs/promises");
      await mkdir(fontDir, { recursive: true });
      const fontFiles = await readdir(projectFontsDir);
      for (const fontFile of fontFiles) {
        if (fontFile.endsWith(".ttf") || fontFile.endsWith(".otf")) {
          await copyFile(join(projectFontsDir, fontFile), join(fontDir, fontFile));
        }
      }
      console.log(`Copied ${fontFiles.length} font files to ${fontDir}`);
    } catch (fontErr) {
      console.warn("Could not copy fonts to temp dir:", fontErr);
      // Continue anyway — FFmpeg may still find system fonts
    }

    // 1. Download video to temp file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download video: ${videoResponse.status}` },
        { status: 500 }
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    await writeFile(inputPath, videoBuffer);

    // 2. Generate ASS subtitle content
    let assContent = customSettings
      ? generateASSFromCustom(words, customSettings)
      : generateASS(words, getCaptionStyle(styleId!));
    if (!assContent) {
      return NextResponse.json(
        { error: "Failed to generate subtitle content" },
        { status: 500 }
      );
    }

    // Replace any font family in the ASS Style line with our bundled font.
    // Vercel serverless has no system fonts — only our bundled Liberation Sans.
    // Liberation Sans is metrically identical to Arial so sizing stays correct.
    assContent = assContent.replace(
      /^(Style: Default,)[^,]+(,.*)$/m,
      "$1Liberation Sans$2"
    );

    await writeFile(assPath, assContent, "utf-8");

    // 3. Run FFmpeg to burn subtitles into video
    const ffmpegBinary = await getFFmpegPath();
    await runFFmpeg(ffmpegBinary, inputPath, assPath, outputPath, fontDir);

    // 4. Read output video
    const outputBuffer = await readFile(outputPath);

    // 5. Upload to Supabase Storage
    const uuid = crypto.randomUUID();
    const filename = `talking-head-captioned_${uuid.slice(0, 8)}.mp4`;
    const filePath = `${user.id}/video/${uuid}_${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, outputBuffer, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 6. Create asset record
    const { data: asset, error: dbError } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        filename,
        file_path: filePath,
        file_type: "video",
        mime_type: "video/mp4",
        file_size: outputBuffer.byteLength,
        tags: ["talking-head", "captioned", "lip-sync"],
        metadata: {
          source: "caption-generator",
          caption_style: customSettings ? "custom" : styleId,
          word_count: words.length,
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

    // 7. Get signed URL for preview
    const { data: signedUrlData } = await supabase.storage
      .from("assets")
      .createSignedUrl(filePath, 3600); // 1 hour

    return NextResponse.json(
      {
        assetId: asset.id,
        signedUrl: signedUrlData?.signedUrl || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add captions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add captions",
      },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    if (tempDir) {
      try {
        const files = ["input.mp4", "subs.ass", "output.mp4"];
        for (const f of files) {
          try {
            await unlink(join(tempDir, f));
          } catch {
            // File may not exist, ignore
          }
        }
        // Clean up font directory
        const fontDirPath = join(tempDir, "fonts");
        try {
          const fontFiles = await readdir(fontDirPath);
          for (const f of fontFiles) {
            try { await unlink(join(fontDirPath, f)); } catch { /* ignore */ }
          }
          const { rmdir } = await import("fs/promises");
          await rmdir(fontDirPath);
        } catch {
          // Font dir may not exist
        }
        // Remove temp directory
        const { rmdir } = await import("fs/promises");
        await rmdir(tempDir);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}

/**
 * Run FFmpeg to burn ASS subtitles into video.
 * Uses the `ass` video filter.
 */
function runFFmpeg(
  ffmpegBinary: string,
  inputPath: string,
  assPath: string,
  outputPath: string,
  fontDir?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // The ass filter path needs to be escaped for FFmpeg filter syntax
    // On Windows, backslashes need escaping; on Unix, colons need escaping
    const escapedAssPath = assPath
      .replace(/\\/g, "/")
      .replace(/:/g, "\\:");

    // Build the ass filter with optional fontsdir for serverless environments
    const escapedFontDir = fontDir
      ? fontDir.replace(/\\/g, "/").replace(/:/g, "\\:")
      : null;
    const assFilter = escapedFontDir
      ? `ass='${escapedAssPath}':fontsdir='${escapedFontDir}'`
      : `ass='${escapedAssPath}'`;

    const args = [
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-vf",
      assFilter,
      "-c:a",
      "copy",
      // Strip all existing metadata (removes AI generation markers)
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

    console.log("Running FFmpeg:", ffmpegBinary, args.join(" "));

    execFile(
      ffmpegBinary,
      args,
      { timeout: 240000 }, // 4 min timeout for FFmpeg
      (error, _stdout, stderr) => {
        if (error) {
          console.error("FFmpeg error:", error.message);
          console.error("FFmpeg stderr:", stderr);
          reject(new Error(`FFmpeg failed: ${error.message}`));
        } else {
          resolve();
        }
      }
    );
  });
}
