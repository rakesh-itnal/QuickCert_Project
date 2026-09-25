"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Merge dynamic columns/fields into existing DataRecords.
 */
export async function mergeRecordsAction(records: any[]) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return { error: "Unauthorized" };
    }

    const orgId = session.organizationId;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const uniqueId = row["Unique ID"] || row["uniqueId"] || row["STS Number"] || row["satsNumber"];
      const name = row["Name"] || row["name"] || row["Student Name"] || row["displayName"];

      if (!uniqueId) {
        continue; // Skip rows without identifier
      }

      // Find record in DB
      const record = await prisma.dataRecord.findFirst({
        where: {
          organizationId: orgId,
          uniqueId: String(uniqueId).trim(),
        }
      });

      if (!record) {
        errors.push(`Record not found: ${name || uniqueId} (${uniqueId})`);
        continue;
      }

      // Parse existing data
      let existingData = {};
      try {
        if (record.data) {
          existingData = JSON.parse(record.data);
        }
      } catch (e) {}

      // Collect field updates
      const newFields: Record<string, string> = { ...existingData };

      for (const [key, value] of Object.entries(row)) {
        if (value === undefined || value === null) continue;
        
        // Skip identifiers
        if (["Unique ID", "uniqueId", "STS Number", "satsNumber", "Name", "name", "Student Name", "displayName"].includes(key)) continue;

        newFields[key] = String(value);
      }

      // Update record
      await prisma.dataRecord.update({
        where: { id: record.id },
        data: {
          data: JSON.stringify(newFields),
          displayName: name ? String(name) : undefined,
        }
      });

      updatedCount++;
    }

    revalidatePath("/dashboard/data");
    return { success: true, updatedCount, errors };
  } catch (error: any) {
    console.error("Merge error:", error);
    return { error: error.message };
  }
}

// Backward compatible alias
export const mergeStudentsAction = mergeRecordsAction;
