import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Serve stored thumbnails from Supabase Storage.
 * GET /api/viral-reels/stored-thumbnail?path=thumbnails/viral-reels/xxx.jpg
 */
export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath || !filePath.startsWith("thumbnails/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from("assets")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Thumbnail not found" },
        { status: 404 }
      );
    }

    // Redirect to the signed URL
    return NextResponse.redirect(data.signedUrl);
  } catch {
    return NextResponse.json(
      { error: "Failed to serve thumbnail" },
      { status: 500 }
    );
  }
}