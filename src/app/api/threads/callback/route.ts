import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getThreadsProfile,
  encryptToken,
  calculateTokenExpiry,
} from "@/lib/threads";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle user denial or error from Meta
  if (error) {
    console.error("Threads OAuth error:", error);
    return NextResponse.redirect(
      `${origin}/dashboard/settings?threads=error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/dashboard/settings?threads=error&message=missing_params`
    );
  }

  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    // Validate state parameter against cookie
    const cookies = request.headers.get("cookie") || "";
    const stateCookie = cookies
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("threads_oauth_state="));

    const savedState = stateCookie?.split("=")[1];

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        `${origin}/dashboard/settings?threads=error&message=invalid_state`
      );
    }

    // Exchange code for short-lived token
    const { access_token: shortToken } = await exchangeCodeForToken(code);

    // Exchange for long-lived token (60 days)
    const { access_token: longToken, expires_in } =
      await getLongLivedToken(shortToken);

    // Fetch user profile
    const profile = await getThreadsProfile(longToken);

    // Encrypt the token for storage
    const encryptedToken = encryptToken(longToken);
    const tokenExpiresAt = calculateTokenExpiry(expires_in);

    // Upsert into threads_accounts
    const { error: dbError } = await supabase
      .from("threads_accounts")
      .upsert(
        {
          user_id: user.id,
          threads_user_id: profile.id,
          username: profile.username || "",
          profile_pic_url: profile.threads_profile_picture_url || "",
          access_token: encryptedToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
        },
        {
          onConflict: "user_id,threads_user_id",
        }
      );

    if (dbError) {
      console.error("Failed to save Threads account:", dbError);
      return NextResponse.redirect(
        `${origin}/dashboard/settings?threads=error&message=db_error`
      );
    }

    // Clear the state cookie
    const response = NextResponse.redirect(
      `${origin}/dashboard/settings?threads=connected`
    );
    response.cookies.set("threads_oauth_state", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Threads callback error:", err);
    return NextResponse.redirect(
      `${origin}/dashboard/settings?threads=error&message=callback_failed`
    );
  }
}
