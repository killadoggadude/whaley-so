import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { QueueStatus } from "@/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { audioSignedUrl, imageSignedUrl, resolution } = body as {
    audioSignedUrl?: string;
    imageSignedUrl?: string;
    resolution?: string;
  };

  if (!audioSignedUrl || !imageSignedUrl) {
    return NextResponse.json(
      { error: "Audio and image URLs are required" },
      { status: 400 }
    );
  }

  const validResolution = resolution === "720p" ? "720p" : "480p";

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }

  const tierPriority: Record<string, number> = {
    enterprise: 1,
    pro: 2,
    basic: 3,
    free: 4,
  };

  const priority = tierPriority[userData.subscription_tier] || 5;

  const { data: queueItem, error: queueError } = await supabase
    .from("generation_queue")
    .insert({
      user_id: user.id,
      generation_type: "talking_head" as const,
      payload: {
        audioSignedUrl,
        imageSignedUrl,
        resolution: validResolution,
      },
      priority,
      status: "pending" as QueueStatus,
      max_retries: 3,
    })
    .select()
    .single();

  if (queueError) {
    return NextResponse.json(
      { error: "Failed to queue job" },
      { status: 500 }
    );
  }

  return NextResponse.json({ queueItem });
}