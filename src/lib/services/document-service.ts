import { prisma } from "@/lib/prisma";
import { createAuditEvent } from "./audit-service";
import type { DocumentStatus, GenerateDocumentResult } from "@/lib/types";
import crypto from "crypto";

// =============================================================================
// Document Number Generation
// =============================================================================

/**
 * Generate a sequential document number: DOC-YYYY-NNNNNN
 */
export async function generateDocumentNumber(
  organizationId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DOC-${year}-`;

  // Count existing documents for this org in this year
  const count = await prisma.document.count({
    where: {
      organizationId,
      documentNumber: { startsWith: prefix },
    },
  });

  const nextNumber = (count + 1).toString().padStart(6, "0");
  return `${prefix}${nextNumber}`;
}

// =============================================================================
// Document Hash
// =============================================================================

/**
 * Compute SHA-256 hash of the document content + metadata for integrity verification.
 */
export function computeDocumentHash(params: {
  documentNumber: string;
  organizationId: string;
  dataSnapshot: Record<string, unknown>;
  templateId?: string;
  issuedAt: string;
}): string {
  const payload = JSON.stringify({
    documentNumber: params.documentNumber,
    organizationId: params.organizationId,
    data: params.dataSnapshot,
    templateId: params.templateId,
    issuedAt: params.issuedAt,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}

// =============================================================================
// Document Lifecycle
// =============================================================================

const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ["GENERATED"],
  GENERATED: ["APPROVED", "ISSUED", "VALID"], // Auto-issue skips APPROVED
  APPROVED: ["SIGNED", "ISSUED", "VALID"],
  SIGNED: ["ISSUED", "VALID"],
  ISSUED: ["VALID", "REVOKED", "SUPERSEDED"],
  VALID: ["REVOKED", "SUPERSEDED", "EXPIRED"],
  REVOKED: [],
  SUPERSEDED: [],
  EXPIRED: [],
};

export function isValidTransition(
  from: DocumentStatus,
  to: DocumentStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}

// =============================================================================
// Document CRUD Operations
// =============================================================================

/**
 * Create a new document in DRAFT status
 */
export async function createDocument(params: {
  organizationId: string;
  recordId?: string;
  definitionId?: string;
  templateId?: string;
  templateVersionNumber?: number;
  dataSnapshot: Record<string, unknown>;
  dynamicFields?: Record<string, unknown>;
  actorId?: string;
  actorName?: string;
}): Promise<{
  id: string;
  documentNumber: string;
  qrValidationKey: string;
  status: DocumentStatus;
}> {
  const documentNumber = await generateDocumentNumber(params.organizationId);
  const now = new Date();

  const documentHash = computeDocumentHash({
    documentNumber,
    organizationId: params.organizationId,
    dataSnapshot: params.dataSnapshot,
    templateId: params.templateId,
    issuedAt: now.toISOString(),
  });

  const document = await prisma.document.create({
    data: {
      documentNumber,
      documentHash,
      status: "DRAFT",
      issueDate: now,
      dataSnapshot: JSON.stringify(params.dataSnapshot),
      dynamicFields: JSON.stringify(params.dynamicFields || {}),
      recordId: params.recordId || null,
      definitionId: params.definitionId || null,
      templateId: params.templateId || null,
      templateVersionNumber: params.templateVersionNumber || null,
      organizationId: params.organizationId,
    },
  });

  await createAuditEvent({
    action: "DOCUMENT_CREATED",
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorName: params.actorName,
    documentId: document.id,
    documentNumber,
    metadata: {
      recordId: params.recordId,
      definitionId: params.definitionId,
      templateId: params.templateId,
    },
  });

  return {
    id: document.id,
    documentNumber: document.documentNumber,
    qrValidationKey: document.qrValidationKey,
    status: document.status as DocumentStatus,
  };
}

/**
 * Transition a document's status
 */
export async function transitionDocumentStatus(params: {
  documentId: string;
  organizationId: string;
  newStatus: DocumentStatus;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  const document = await prisma.document.findUnique({
    where: { id: params.documentId },
  });

  if (!document || document.organizationId !== params.organizationId) {
    return { success: false, error: "Document not found or access denied." };
  }

  const currentStatus = document.status as DocumentStatus;
  if (!isValidTransition(currentStatus, params.newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${currentStatus} to ${params.newStatus}.`,
    };
  }

  await prisma.document.update({
    where: { id: params.documentId },
    data: { status: params.newStatus },
  });

  const actionMap: Record<string, string> = {
    GENERATED: "DOCUMENT_GENERATED",
    APPROVED: "DOCUMENT_APPROVED",
    SIGNED: "DOCUMENT_SIGNED",
    ISSUED: "DOCUMENT_ISSUED",
    VALID: "DOCUMENT_ISSUED",
  };

  await createAuditEvent({
    action: (actionMap[params.newStatus] || "DOCUMENT_CREATED") as import("@/lib/types").AuditAction,
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorName: params.actorName,
    documentId: params.documentId,
    documentNumber: document.documentNumber,
    metadata: {
      previousStatus: currentStatus,
      newStatus: params.newStatus,
      ...params.metadata,
    },
  });

  return { success: true };
}

/**
 * Revoke a document
 */
export async function revokeDocument(params: {
  documentId: string;
  organizationId: string;
  reason: string;
  actorId: string;
  actorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const document = await prisma.document.findUnique({
    where: { id: params.documentId },
  });

  if (!document || document.organizationId !== params.organizationId) {
    return { success: false, error: "Document not found or access denied." };
  }

  const status = document.status as DocumentStatus;
  if (status === "REVOKED") {
    return { success: false, error: "Document is already revoked." };
  }
  if (status === "DRAFT" || status === "GENERATED") {
    return {
      success: false,
      error: "Cannot revoke a document that has not been issued.",
    };
  }

  await prisma.document.update({
    where: { id: params.documentId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: params.reason,
      revokedById: params.actorId,
    },
  });

  await createAuditEvent({
    action: "DOCUMENT_REVOKED",
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorName: params.actorName,
    documentId: params.documentId,
    documentNumber: document.documentNumber,
    metadata: { reason: params.reason, previousStatus: status },
  });

  return { success: true };
}

/**
 * Supersede a document with a new version
 */
export async function supersedeDocument(params: {
  oldDocumentId: string;
  newDocumentId: string;
  organizationId: string;
  actorId?: string;
  actorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const oldDoc = await prisma.document.findUnique({
    where: { id: params.oldDocumentId },
  });

  if (!oldDoc || oldDoc.organizationId !== params.organizationId) {
    return { success: false, error: "Original document not found." };
  }

  // Mark old document as superseded
  await prisma.document.update({
    where: { id: params.oldDocumentId },
    data: {
      status: "SUPERSEDED",
      supersededById: params.newDocumentId,
    },
  });

  // Link new document to old
  await prisma.document.update({
    where: { id: params.newDocumentId },
    data: {
      previousVersionId: params.oldDocumentId,
      version: oldDoc.version + 1,
    },
  });

  await createAuditEvent({
    action: "DOCUMENT_SUPERSEDED",
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorName: params.actorName,
    documentId: params.oldDocumentId,
    documentNumber: oldDoc.documentNumber,
    metadata: {
      supersededById: params.newDocumentId,
    },
  });

  return { success: true };
}

/**
 * Get full document details with related data
 */
export async function getDocumentDetails(
  documentId: string,
  organizationId: string
) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      record: true,
      definition: true,
      template: true,
      organization: true,
    },
  });

  if (!document || document.organizationId !== organizationId) {
    return null;
  }

  return {
    ...document,
    dataSnapshot: document.dataSnapshot
      ? JSON.parse(document.dataSnapshot)
      : {},
    dynamicFields: document.dynamicFields
      ? JSON.parse(document.dynamicFields)
      : {},
    signatureData: document.signatureData
      ? JSON.parse(document.signatureData)
      : {},
  };
}

/**
 * Get document for public verification (privacy-aware)
 */
export async function getDocumentForVerification(
  qrValidationKey: string
) {
  const document = await prisma.document.findUnique({
    where: { qrValidationKey },
    include: {
      organization: {
        select: {
          name: true,
          registrationNumber: true,
        },
      },
      definition: {
        select: {
          name: true,
          category: true,
          verificationConfig: true,
        },
      },
    },
  });

  if (!document) {
    return null;
  }

  // Log verification event (non-blocking)
  void createAuditEvent({
    action: "DOCUMENT_VERIFIED",
    organizationId: document.organizationId,
    documentId: document.id,
    documentNumber: document.documentNumber,
  });

  return {
    documentNumber: document.documentNumber,
    status: document.status as DocumentStatus,
    issueDate: document.issueDate,
    version: document.version,
    revokedAt: document.revokedAt,
    revokedReason: document.revokedReason,
    expiresAt: document.expiresAt,
    organizationName: document.organization?.name,
    organizationRegNumber: document.organization?.registrationNumber,
    documentType: document.definition?.name || "Document",
    documentCategory: document.definition?.category,
    documentHash: document.documentHash,
  };
}
