import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate it's an audio file
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Expected audio.` },
        { status: 400 }
      );
    }

    const uuid = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/audio/${uuid}_${safeName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Create asset record
    const { data: asset, error: dbError } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        filename: safeName,
        file_path: filePath,
        file_type: "audio",
        mime_type: file.type,
        file_size: file.size,
        tags: ["talking-head", "tts-audio"],
        metadata: { source: "talking-head-wizard" },
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

    // Generate signed URL for InfiniteTalk to access
    const { data: signedData } = await supabase.storage
      .from("assets")
      .createSignedUrl(filePath, 3600); // 1 hour TTL

    if (!signedData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        assetId: asset.id,
        signedUrl: signedData.signedUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Audio upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload audio",
      },
      { status: 500 }
    );
  }
}
