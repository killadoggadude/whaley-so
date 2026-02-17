import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Delete the threads account (RLS ensures user can only delete own rows)
    const { error } = await supabase
      .from("threads_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to disconnect Threads account:", error);
      return NextResponse.json(
        { error: "Failed to disconnect account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Threads disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
