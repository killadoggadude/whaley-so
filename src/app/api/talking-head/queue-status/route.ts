import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const queueId = searchParams.get("queueId");

  if (!queueId) {
    return NextResponse.json({ error: "queueId is required" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("generation_queue")
    .select("*")
    .eq("id", queueId)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "completed" && job.result) {
    return NextResponse.json({
      status: "completed",
      taskId: (job.result as Record<string, unknown>).taskId as string,
    });
  }

  if (job.status === "failed") {
    return NextResponse.json({
      status: "failed",
      error: job.error_message || "Job failed",
    });
  }

  return NextResponse.json({
    status: job.status,
    retry_count: job.retry_count,
    max_retries: job.max_retries,
    error_message: job.error_message,
  });
}