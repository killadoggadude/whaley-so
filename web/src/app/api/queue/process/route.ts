import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { QueueStatus } from "@/types";

export const dynamic = "force-dynamic";

const RETRYABLE_ERRORS = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "429",
  "503",
  "502",
]);

const NON_RETRYABLE_ERRORS = new Set([
  "400",
  "401",
  "403",
  "404",
]);

function isRetryableError(error: string | null): boolean {
  if (!error) return false;

  for (const retryable of RETRYABLE_ERRORS) {
    if (error.includes(retryable)) return true;
  }

  return !NON_RETRYABLE_ERRORS.has(error);
}

async function processTalkingHeadJob(payload: Record<string, unknown>) {
  const { audioSignedUrl, imageSignedUrl, resolution } = payload as {
    audioSignedUrl: string;
    imageSignedUrl: string;
    resolution: "480p" | "720p";
  };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/talking-head/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioSignedUrl, imageSignedUrl, resolution }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Video generation failed");
  }

  return await response.json();
}

async function processQueuedJob(supabase: any, job: any) {
  console.log(`Processing job ${job.id}: ${job.generation_type}`);

  const { error: updateError } = await supabase
    .from("generation_queue")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (updateError) {
    console.error("Failed to update job status:", updateError);
    return;
  }

  try {
    let result;

    switch (job.generation_type) {
      case "talking_head":
        result = await processTalkingHeadJob(job.payload);
        break;
      default:
        throw new Error(`Unknown generation type: ${job.generation_type}`);
    }

    await supabase
      .from("generation_queue")
      .update({
        status: "completed" as QueueStatus,
        completed_at: new Date().toISOString(),
        result,
      })
      .eq("id", job.id);

    console.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isRetryable = isRetryableError(errorMessage);

    console.error(`Job ${job.id} failed:`, errorMessage, {
      isRetryable,
      retryCount: job.retry_count,
      maxRetries: job.max_retries,
    });

    if (isRetryable && job.retry_count < job.max_retries) {
      const retryCount = job.retry_count + 1;
      const backoff_ms = Math.pow(2, retryCount - 1) * 1000;

      await supabase
        .from("generation_queue")
        .update({
          status: "retrying" as QueueStatus,
          scheduled_at: new Date(Date.now() + backoff_ms).toISOString(),
          retry_count: retryCount,
          error_message: errorMessage,
        })
        .eq("id", job.id);

      console.log(`Job ${job.id} will retry in ${backoff_ms / 1000}s`);
    } else {
      await supabase
        .from("generation_queue")
        .update({
          status: "failed" as QueueStatus,
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq("id", job.id);

      console.log(`Job ${job.id} failed permanently`);
    }
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, subscription_tier");

  if (usersError) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }

  const tierPriority: Record<string, number> = {
    enterprise: 1,
    pro: 2,
    basic: 3,
    free: 4,
  };

  const now = new Date().toISOString();

  for (const user of users || []) {
    const { data: jobs, error: jobsError } = await supabase
      .from("generation_queue")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "retrying"])
      .lte("scheduled_at", now)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (jobsError) {
      console.error("Failed to fetch jobs:", jobsError);
      continue;
    }

    const userPriority = tierPriority[user.subscription_tier] || 4;

    for (const job of jobs || []) {
      await processQueuedJob(supabase, job);
    }
  }

  return NextResponse.json({ success: true });
}