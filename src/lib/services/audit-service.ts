"use server";

import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/lib/types";

/**
 * Create an immutable audit event. 
 * Never throws — audit failures should not block business operations.
 */
export async function createAuditEvent(params: {
  action: AuditAction;
  organizationId: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  documentId?: string | null;
  documentNumber?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        action: params.action,
        organizationId: params.organizationId,
        actorId: params.actorId || null,
        actorName: params.actorName || null,
        actorRole: params.actorRole || null,
        documentId: params.documentId || null,
        documentNumber: params.documentNumber || null,
        metadata: JSON.stringify(params.metadata || {}),
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error("AUDIT EVENT ERROR (non-blocking):", error);
  }
}

/**
 * Get audit events for an organization with optional filtering.
 */
export async function getAuditEvents(params: {
  organizationId: string;
  documentId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {
    organizationId: params.organizationId,
  };

  if (params.documentId) where.documentId = params.documentId;
  if (params.action) where.action = params.action;

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: params.limit || 50,
    skip: params.offset || 0,
  });

  return events.map((event) => ({
    ...event,
    metadata: event.metadata ? JSON.parse(event.metadata) : {},
  }));
}

/**
 * Get the timeline of events for a specific document.
 */
export async function getDocumentTimeline(
  organizationId: string,
  documentId: string
) {
  const events = await prisma.auditEvent.findMany({
    where: {
      organizationId,
      documentId,
    },
    orderBy: { timestamp: "asc" },
  });

  return events.map((event) => ({
    ...event,
    metadata: event.metadata ? JSON.parse(event.metadata) : {},
  }));
}
