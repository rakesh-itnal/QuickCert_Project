import { prisma } from "@/lib/prisma";
import { createAuditEvent } from "./audit-service";
import crypto from "crypto";
import type { CreateApiKeyResult } from "@/lib/types";

/**
 * Generate a new API key for an organization.
 * The raw key is only returned ONCE at creation time.
 */
export async function createApiKey(params: {
  name: string;
  scopes: string[];
  organizationId: string;
  expiresAt?: Date;
  actorId?: string;
  actorName?: string;
}): Promise<CreateApiKeyResult> {
  // Generate a cryptographically secure API key
  const rawKey = `qc_live_${crypto.randomBytes(32).toString("hex")}`;
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.create({
    data: {
      name: params.name,
      keyHash,
      keyPrefix,
      scopes: JSON.stringify(params.scopes),
      organizationId: params.organizationId,
      expiresAt: params.expiresAt || null,
    },
  });

  await createAuditEvent({
    action: "API_KEY_CREATED",
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorName: params.actorName,
    metadata: { apiKeyId: apiKey.id, name: params.name, scopes: params.scopes },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    key: rawKey,           // ONLY returned at creation
    keyPrefix,
    scopes: params.scopes,
  };
}

/**
 * Validate an API key and return the associated organization.
 */
export async function validateApiKey(rawKey: string): Promise<{
  valid: boolean;
  organizationId?: string;
  scopes?: string[];
  error?: string;
}> {
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, isActive: true },
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid API key." };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired." };
  }

  // Update last used timestamp (non-blocking)
  void prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    valid: true,
    organizationId: apiKey.organizationId,
    scopes: JSON.parse(apiKey.scopes),
  };
}

/**
 * List all API keys for an organization (without exposing hashes)
 */
export async function listApiKeys(organizationId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return keys.map((key) => ({
    ...key,
    scopes: JSON.parse(key.scopes),
  }));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  keyId: string,
  organizationId: string,
  actorId?: string,
  actorName?: string
) {
  const key = await prisma.apiKey.findUnique({ where: { id: keyId } });

  if (!key || key.organizationId !== organizationId) {
    return { error: "API key not found or access denied." };
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });

  await createAuditEvent({
    action: "API_KEY_REVOKED",
    organizationId,
    actorId,
    actorName,
    metadata: { apiKeyId: keyId, name: key.name },
  });

  return { success: true };
}
