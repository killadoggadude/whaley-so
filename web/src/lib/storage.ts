import { createClient } from "@/lib/supabase/server";

const BUCKET = "assets";
const SIGNED_URL_EXPIRY = 3600; // 1 hour
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TYPE_MAP: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/mp4": "audio",
  "audio/webm": "audio",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "application/pdf": "document",
};

export function getFileType(mimeType: string): string | null {
  return MIME_TYPE_MAP[mimeType] || null;
}

export function isAllowedMimeType(mimeType: string): boolean {
  return mimeType in MIME_TYPE_MAP;
}

export function isAllowedFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * Get a signed URL for a file. Time-limited for security.
 */
export async function getSignedUrl(filePath: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  if (error) throw new Error(`Failed to create signed URL: ${error.message}`);
  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteStorageFile(filePath: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);

  if (error) throw new Error(`Failed to delete file: ${error.message}`);
}
