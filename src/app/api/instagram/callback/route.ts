import { NextRequest, NextResponse } from "next/server";

/**
 * Instagram OAuth callback handler.
 *
 * Since we're using the Instagram API with Instagram Login (Business) flow,
 * the token is generated directly in the Facebook Developer Dashboard
 * under "API setup with Instagram business login" > "Generate access tokens".
 *
 * This callback route is kept for future use if we need to implement
 * an OAuth flow for end users to connect their own Instagram accounts.
 *
 * For now, it handles any redirect from Instagram and displays the token.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    return NextResponse.json(
      {
        error: "Instagram authorization failed",
        details: errorDescription || error,
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  // Exchange code for token
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI ||
    "http://localhost:3000/api/instagram/callback";

  if (!appId || !appSecret) {
    return NextResponse.json(
      {
        error: "Instagram app credentials not configured",
        instructions:
          "Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env.local",
      },
      { status: 500 }
    );
  }

  try {
    // Step 1: Exchange code for short-lived token
    const tokenUrl = "https://api.instagram.com/oauth/access_token";
    const body = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json();
      return NextResponse.json(
        { error: "Failed to exchange code", details: errorData },
        { status: 500 }
      );
    }

    const tokenData = await tokenRes.json();

    // Step 2: Exchange for long-lived token
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`;
    const longLivedRes = await fetch(longLivedUrl);

    if (!longLivedRes.ok) {
      // Return short-lived token if exchange fails
      return NextResponse.json({
        success: true,
        token_type: "short-lived",
        access_token: tokenData.access_token,
        user_id: tokenData.user_id,
        instructions:
          "Add this to .env.local as INSTAGRAM_ACCESS_TOKEN (short-lived, ~1hr)",
      });
    }

    const longLivedData = await longLivedRes.json();

    return NextResponse.json({
      success: true,
      token_type: "long-lived",
      access_token: longLivedData.access_token,
      user_id: tokenData.user_id,
      expires_in_days: Math.round(
        (longLivedData.expires_in || 5184000) / 86400
      ),
      instructions:
        "Add this to .env.local as INSTAGRAM_ACCESS_TOKEN (60-day token)",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Instagram OAuth failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
