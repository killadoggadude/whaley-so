import { createClient } from "@/lib/supabase/server";
import { getThreadsAuthUrl } from "@/lib/threads";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Generate random state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Build the authorization URL
    const authUrl = getThreadsAuthUrl(state);

    // Set state in cookie for validation in callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("threads_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Threads authorize error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Threads authorization" },
      { status: 500 }
    );
  }
}
