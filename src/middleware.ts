import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Protect both /dashboard and /admin routes
  if (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin")) {
    
    // Check if they have a valid encrypted session cookie
    const hasSession = request.cookies.has("quickcert_session");
    
    if (!hasSession) {
      // No active session found, physically reject access and force them to login page
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow them to proceed if it's not a protected route or if they have a session
  return NextResponse.next();
}

// Optimization: Tell Next.js to only run middleware on specific paths
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
