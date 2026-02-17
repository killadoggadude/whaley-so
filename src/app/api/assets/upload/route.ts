import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFileType, isAllowedMimeType, isAllowedFileSize } from "@/lib/storage";

export const maxDuration = 60; // 60s for large file uploads to Supabase

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
    const tagsRaw = formData.get("tags") as string | null;
    const metadataRaw = formData.get("metadata") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    if (!isAllowedFileSize(file.size)) {
      return NextResponse.json(
        { error: "File exceeds 50MB size limit" },
        { status: 400 }
      );
    }

    const fileType = getFileType(file.type)!;
    const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) : [];
    const metadata: Record<string, unknown> = metadataRaw
      ? JSON.parse(metadataRaw)
      : {};

    // Generate unique path: {user_id}/{type}/{uuid}_{filename}
    const uuid = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${fileType}/${uuid}_${safeName}`;

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

    // Create database record
    const { data, error: dbError } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        filename: file.name,
        file_path: filePath,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        tags,
        metadata,
      })
      .select("id, filename, file_type, file_size, created_at")
      .single();

    if (dbError) {
      // Rollback: remove uploaded file
      await supabase.storage.from("assets").remove([filePath]);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Generate signed URL so callers can use the asset immediately
    let signed_url = "";
    try {
      const { data: urlData } = await supabase.storage
        .from("assets")
        .createSignedUrl(filePath, 3600); // 1 hour
      signed_url = urlData?.signedUrl || "";
    } catch {
      // Non-fatal: caller can still use the asset ID
    }

    return NextResponse.json({ asset: { ...data, signed_url } }, { status: 201 });
  } catch (error) {
    console.error("Asset upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
