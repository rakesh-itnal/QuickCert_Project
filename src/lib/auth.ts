import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { UserRole, Permission } from "@/lib/types";
import { ROLE_PERMISSIONS } from "@/lib/types";

function getJwtKey() {
  const configuredSecret = process.env.JWT_SECRET;

  if (configuredSecret) {
    return new TextEncoder().encode(configuredSecret);
  }

  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("quickcert_super_secret_dev_key_2026!@");
  }

  throw new Error("JWT_SECRET must be configured in production.");
}

export interface SessionPayload extends JWTPayload {
  userId: string;
  role: string;
  organizationId: string;
  // Legacy alias — kept for backward compatibility with existing cookies
  instituteId?: string;
}

// Ensure password is cryptographically difficult to breach
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate the encrypted cookie JWT for the session
export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtKey());
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, getJwtKey(), { algorithms: ["HS256"] });
    const session = payload as unknown as SessionPayload;
    // Ensure backward compatibility: if old cookie has instituteId but not organizationId
    if (!session.organizationId && session.instituteId) {
      session.organizationId = session.instituteId;
    }
    return session;
  } catch {
    return null;
  }
}

// A helper to quickly retrieve the session from cookies
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("quickcert_session")?.value;
  if (!sessionCookie) return null;
  const session = await decrypt(sessionCookie);
  if (session) {
    // Ensure both aliases are set for compatibility
    if (!session.organizationId && session.instituteId) {
      session.organizationId = session.instituteId;
    }
    if (!session.instituteId && session.organizationId) {
      session.instituteId = session.organizationId;
    }
  }
  return session;
}

// Set the session cookie permanently in the browser
export async function setupSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 Day
  // Ensure both aliases are set
  if (!payload.instituteId) payload.instituteId = payload.organizationId;
  if (!payload.organizationId && payload.instituteId) payload.organizationId = payload.instituteId;

  const sessionString = await encrypt(payload);
  
  const cookieStore = await cookies();
  cookieStore.set("quickcert_session", sessionString, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
    sameSite: "lax",
  });
}

// Clear session cookie for logout
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set("quickcert_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
    sameSite: "lax",
  });
}

// =============================================================================
// Permission-based Authorization
// =============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Require a specific permission — returns an error if unauthorized
 */
export async function requirePermission(
  permission: Permission
): Promise<{ session: SessionPayload } | { error: string }> {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return { error: "Unauthorized. Please log in first." };
  }
  if (!hasPermission(session.role, permission)) {
    return { error: `Insufficient permissions. Required: ${permission}` };
  }
  return { session };
}
