import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/services/api-key-service";

export async function GET() {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await listApiKeys(session.organizationId);
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, scopes, expiresAt } = await request.json();

    if (!name || !scopes || !Array.isArray(scopes)) {
      return NextResponse.json({ error: "Missing required fields: name and scopes (array)" }, { status: 400 });
    }

    const key = await createApiKey({
      name,
      scopes,
      organizationId: session.organizationId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      actorId: session.userId,
      actorName: session.userId, // denormalized
    });

    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");

  if (!keyId) {
    return NextResponse.json({ error: "API key ID required" }, { status: 400 });
  }

  const result = await revokeApiKey(keyId, session.organizationId, session.userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "API key revoked." });
}
