import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setupSession } from "@/lib/auth";

// Step 2: Google redirects back here with a code. Exchange it for user info.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/login?error=google_cancelled`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData);
      return NextResponse.redirect(`${baseUrl}/login?error=google_token_failed`);
    }

    // Fetch user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();

    if (!profile.email) {
      return NextResponse.redirect(`${baseUrl}/login?error=google_no_email`);
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email: profile.email } });

    if (user) {
      // Existing user — log them in
      await setupSession({
        userId: user.id,
        organizationId: user.organizationId,
        instituteId: user.organizationId,
        role: user.role,
      });

      return NextResponse.redirect(`${baseUrl}/dashboard`);
    }

    // New Google user — create organization + user automatically
    const organizationName = profile.name ? `${profile.name}'s Organization` : "My Organization";
    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);

    const newOrg = await prisma.organization.create({
      data: {
        name: organizationName,
        slug,
        users: {
          create: {
            email: profile.email,
            name: profile.name || profile.email.split("@")[0],
            passwordHash: "", // No password for Google users
            role: "OWNER",
            authProvider: "google",
            avatarUrl: profile.picture || null,
          },
        },
      },
      include: { users: true },
    });

    const newUser = newOrg.users[0];

    await setupSession({
      userId: newUser.id,
      organizationId: newOrg.id,
      instituteId: newOrg.id,
      role: newUser.role,
    });

    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (err: any) {
    console.error("GOOGLE AUTH ERROR:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=google_server_error`);
  }
}
