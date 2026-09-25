"use server"

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createDocument, transitionDocumentStatus } from "@/lib/services/document-service";
import { createAuditEvent } from "@/lib/services/audit-service";
import { revalidatePath } from "next/cache";

/**
 * Generate a single document from a data record and template
 */
export async function generateSingleDocument(formData: {
  recordId?: string;
  templateId: string;
  definitionId?: string;
  data?: Record<string, unknown>;  // Direct data (for API usage)
  dynamicFields?: Record<string, unknown>;
  customChoices?: Record<string, string>;
  autoIssue?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return { error: "Unauthorized. Please log in first." };
    }

    const orgId = session.organizationId;

    // Resolve data: either from a record or directly provided
    let recordData: Record<string, unknown> = {};
    let displayName = "Document";

    if (formData.recordId) {
      const record = await prisma.dataRecord.findUnique({
        where: { id: formData.recordId },
      });

      if (!record || record.organizationId !== orgId) {
        return { error: "Record not found or access denied." };
      }

      recordData = JSON.parse(record.data);
      displayName = record.displayName || record.uniqueId;
    } else if (formData.data) {
      recordData = formData.data;
      displayName = (formData.data.name as string) || (formData.data.displayName as string) || "Document";
    }

    // Merge dynamic fields
    if (formData.dynamicFields) {
      recordData = { ...recordData, ...formData.dynamicFields };
    }

    // Fetch organization data
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) return { error: "Organization not found." };

    // Create the document record with a unique number
    const document = await createDocument({
      organizationId: orgId,
      recordId: formData.recordId,
      definitionId: formData.definitionId,
      templateId: formData.templateId,
      dataSnapshot: recordData,
      dynamicFields: formData.dynamicFields,
      actorId: session.userId,
    });

    // Fetch the template
    const template = await prisma.documentTemplate.findUnique({
      where: { id: formData.templateId },
    });

    let pdfBytes: Uint8Array;

    if (template && template.fieldMappings) {
      const blueprint = JSON.parse(template.fieldMappings);

      // Inject user choices into blueprint fields as manual text
      if (formData.customChoices && blueprint.fields) {
        blueprint.fields = blueprint.fields.map((f: any) => {
          if (formData.customChoices![f.id]) {
            return { ...f, manual_text: formData.customChoices![f.id] };
          }
          return f;
        });
      }

      // Build the flat data dictionary for rendering
      const flatData: Record<string, string> = {};
      for (const [key, value] of Object.entries(recordData)) {
        flatData[key] = String(value ?? "");
      }
      // Add org data
      flatData["organizationName"] = org.name;
      flatData["organizationAddress"] = org.address || "";
      flatData["registrationNumber"] = org.registrationNumber || "";

      const res = await fetch("http://127.0.0.1:8001/api/generate-overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: {
            template_id: template.id,
            source_image_url: template.backgroundImageUrl,
            image_width: blueprint.imageWidth,
            image_height: blueprint.imageHeight,
            fields: blueprint.fields || [],
          },
          record_data: flatData,
          debug_guides: false,
          include_background: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate PDF from backend");
      }

      const data = await res.json();

      // Download the generated PDF from the backend URL
      const pdfRes = await fetch(`http://127.0.0.1:8001${data.download_url}`);
      const arrayBuffer = await pdfRes.arrayBuffer();
      pdfBytes = new Uint8Array(arrayBuffer);
    } else {
      return { error: "Template not found or has no field mappings configured." };
    }

    // Transition to GENERATED status
    await transitionDocumentStatus({
      documentId: document.id,
      organizationId: orgId,
      newStatus: "GENERATED",
      actorId: session.userId,
    });

    // Auto-issue if requested
    if (formData.autoIssue !== false) {
      await transitionDocumentStatus({
        documentId: document.id,
        organizationId: orgId,
        newStatus: "ISSUED",
        actorId: session.userId,
      });
    }

    // Convert to base64 for client download
    const base64 = Buffer.from(pdfBytes).toString("base64");
    const safeName = String(displayName).replace(/[^a-zA-Z0-9]/g, "_");

    revalidatePath("/dashboard/documents");
    return {
      success: true,
      pdfBase64: base64,
      fileName: `${safeName}_${document.documentNumber}.pdf`,
      documentId: document.id,
      documentNumber: document.documentNumber,
      verificationUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/v/${document.qrValidationKey}`,
    };
  } catch (error: any) {
    console.error("DOCUMENT GENERATION ERROR:", error);
    return { error: `Failed to generate document: ${error.message}` };
  }
}

/**
 * Generate multiple documents in bulk
 */
export async function generateBulkDocuments(formData: {
  recordIds: string[];
  templateId: string;
  definitionId?: string;
  dynamicFields?: Record<string, unknown>;
  customChoices?: Record<string, string>;
}) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return { error: "Unauthorized." };
    }

    const orgId = session.organizationId;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) return { error: "Organization not found." };

    // Fetch all records
    const records = await prisma.dataRecord.findMany({
      where: {
        id: { in: formData.recordIds },
        organizationId: orgId,
      },
    });

    if (records.length === 0) {
      return { error: "No records matched your selection." };
    }

    // Fetch template
    const template = await prisma.documentTemplate.findUnique({
      where: { id: formData.templateId },
    });

    if (!template || !template.fieldMappings) {
      return { error: "Template not found or has no field mappings." };
    }

    // Dynamically import jszip for bulk
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const record of records) {
      const recordData = JSON.parse(record.data);

      // Create document
      const document = await createDocument({
        organizationId: orgId,
        recordId: record.id,
        definitionId: formData.definitionId,
        templateId: formData.templateId,
        dataSnapshot: recordData,
        dynamicFields: formData.dynamicFields,
        actorId: session.userId,
      });

      const blueprint = JSON.parse(template.fieldMappings);

      // Inject choices
      if (formData.customChoices && blueprint.fields) {
        blueprint.fields = blueprint.fields.map((f: any) => {
          if (formData.customChoices![f.id]) {
            return { ...f, manual_text: formData.customChoices![f.id] };
          }
          return f;
        });
      }

      // Build flat data
      const flatData: Record<string, string> = {};
      for (const [key, value] of Object.entries(recordData)) {
        flatData[key] = String(value ?? "");
      }
      if (formData.dynamicFields) {
        for (const [key, value] of Object.entries(formData.dynamicFields)) {
          flatData[key] = String(value ?? "");
        }
      }
      flatData["organizationName"] = org.name;
      flatData["organizationAddress"] = org.address || "";
      flatData["registrationNumber"] = org.registrationNumber || "";

      const res = await fetch("http://127.0.0.1:8001/api/generate-overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: {
            template_id: template.id,
            source_image_url: template.backgroundImageUrl,
            image_width: blueprint.imageWidth,
            image_height: blueprint.imageHeight,
            fields: blueprint.fields || [],
          },
          record_data: flatData,
          debug_guides: false,
          include_background: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF from backend");
      const data = await res.json();

      const pdfRes = await fetch(`http://127.0.0.1:8001${data.download_url}`);
      const arrayBuffer = await pdfRes.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);

      // Transition status
      await transitionDocumentStatus({
        documentId: document.id,
        organizationId: orgId,
        newStatus: "ISSUED",
        actorId: session.userId,
      });

      const safeName = (record.displayName || record.uniqueId).replace(/[^a-zA-Z0-9]/g, "_");
      zip.file(`${safeName}_${document.documentNumber}.pdf`, pdfBytes);
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    const zipBase64 = Buffer.from(zipBytes).toString("base64");

    revalidatePath("/dashboard/documents");
    return {
      success: true,
      zipBase64,
      fileName: `Bulk_Documents_${records.length}_records.zip`,
      count: records.length,
    };
  } catch (error: any) {
    console.error("BULK GENERATION ERROR:", error);
    return { error: `Bulk generation failed: ${error.message}` };
  }
}

// =============================================================================
// Backward compatible exports (alias old function names)
// =============================================================================
export const generateSingleCertificate = generateSingleDocument;
export const generateBulkCertificates = generateBulkDocuments;
