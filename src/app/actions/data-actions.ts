"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { importDataRecords, upsertDataRecord } from "@/lib/services/data-service";
import { createAuditEvent } from "@/lib/services/audit-service";

/**
 * Add a single data record from a form
 */
export async function addDataRecord(prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return { error: "Unauthorized. Please log in." };
    }

    const uniqueId = formData.get("uniqueId") as string;
    const displayName = formData.get("displayName") as string;
    const schemaId = formData.get("schemaId") as string;

    if (!uniqueId) {
      return { error: "Unique ID is required." };
    }

    // Collect all dynamic fields from the form
    const data: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (["uniqueId", "displayName", "schemaId"].includes(key)) continue;
      data[key] = value as string;
    }

    // Check for duplicate
    const existing = await prisma.dataRecord.findUnique({
      where: {
        organizationId_uniqueId: {
          organizationId: session.organizationId,
          uniqueId: uniqueId.trim(),
        },
      },
    });

    if (existing) {
      return { error: `A record with ID "${uniqueId}" already exists.` };
    }

    await prisma.dataRecord.create({
      data: {
        uniqueId: uniqueId.trim(),
        displayName: displayName || null,
        data: JSON.stringify(data),
        schemaId: schemaId || null,
        organizationId: session.organizationId,
      },
    });

    await createAuditEvent({
      action: "RECORD_CREATED",
      organizationId: session.organizationId,
      actorId: session.userId,
      metadata: { uniqueId, displayName },
    });

    revalidatePath("/dashboard/data");
    return { success: true, message: "Record added successfully." };
  } catch (error: any) {
    console.error("ADD RECORD ERROR:", error);
    return { error: error.message || "Failed to add record." };
  }
}

/**
 * Update a single data record
 */
export async function updateDataRecord(prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return { error: "Unauthorized." };
    }

    const recordId = formData.get("recordId") as string;
    if (!recordId) return { error: "Record ID is required." };

    const record = await prisma.dataRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.organizationId !== session.organizationId) {
      return { error: "Record not found or access denied." };
    }

    const displayName = formData.get("displayName") as string;

    // Collect updated fields
    const data: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (["recordId", "displayName", "uniqueId", "schemaId"].includes(key)) continue;
      data[key] = value as string;
    }

    // Preserve edit history
    const existingData = record.data ? JSON.parse(record.data) : {};
    let editHistory: any[] = [];
    try {
      editHistory = record.editHistory ? JSON.parse(record.editHistory) : [];
    } catch {}
    editHistory.push({
      timestamp: new Date().toISOString(),
      actorId: session.userId,
      previousData: existingData,
    });

    await prisma.dataRecord.update({
      where: { id: recordId },
      data: {
        displayName: displayName || record.displayName,
        data: JSON.stringify({ ...existingData, ...data }),
        editHistory: JSON.stringify(editHistory.slice(-20)), // Keep last 20 edits
      },
    });

    await createAuditEvent({
      action: "RECORD_UPDATED",
      organizationId: session.organizationId,
      actorId: session.userId,
      metadata: { recordId, updatedFields: Object.keys(data) },
    });

    revalidatePath("/dashboard/data");
    return { success: true, message: "Record updated successfully." };
  } catch (error: any) {
    return { error: error.message || "Failed to update record." };
  }
}

/**
 * Delete one or more data records
 */
export async function deleteDataRecords(recordIds: string[]) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return { error: "Unauthorized." };
    }

    const result = await prisma.dataRecord.deleteMany({
      where: {
        id: { in: recordIds },
        organizationId: session.organizationId,
      },
    });

    await createAuditEvent({
      action: "RECORD_DELETED",
      organizationId: session.organizationId,
      actorId: session.userId,
      metadata: { recordIds, deletedCount: result.count },
    });

    revalidatePath("/dashboard/data");
    return { success: true, deletedCount: result.count };
  } catch (error: any) {
    return { error: error.message || "Failed to delete records." };
  }
}

/**
 * Bulk import records from parsed spreadsheet data.
 * This is the generic replacement for the old Excel student importer.
 */
export async function bulkImportRecords(params: {
  fileName: string;
  fileSize?: number;
  records: Array<Record<string, string>>;
  idColumn: string;         // Which column to use as the unique ID
  nameColumn?: string;      // Which column to use as the display name
  schemaId?: string;
}) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return { error: "Unauthorized." };
    }

    if (!params.records || params.records.length === 0) {
      return { error: "No records to import." };
    }

    if (!params.idColumn) {
      return { error: "Unique ID column must be specified." };
    }

    // Transform raw rows into DataRecord format
    const transformedRecords = params.records
      .filter((row) => row[params.idColumn])
      .map((row) => ({
        uniqueId: String(row[params.idColumn]).trim(),
        displayName: params.nameColumn ? row[params.nameColumn] : undefined,
        data: { ...row },
      }));

    if (transformedRecords.length === 0) {
      return { error: `No valid records found. Check your ID column "${params.idColumn}".` };
    }

    const result = await importDataRecords({
      fileName: params.fileName,
      fileSize: params.fileSize,
      records: transformedRecords,
      schemaId: params.schemaId,
      organizationId: session.organizationId,
      actorId: session.userId,
    });

    revalidatePath("/dashboard/data");
    return {
      success: true,
      importId: result.importId,
      recordCount: result.recordCount,
      message: `Successfully imported ${result.recordCount} records.`,
    };
  } catch (error: any) {
    console.error("BULK IMPORT ERROR:", error);
    return { error: error.message || "Failed to import records." };
  }
}
