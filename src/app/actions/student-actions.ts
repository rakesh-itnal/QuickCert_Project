// Backward compatibility layer - maps student action calls to DataRecord / DataImport actions.
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function importStudents(...args: any[]): Promise<{
  success?: any;
  error?: string;
  count?: number;
  importedSATS?: string[];
  importedCount?: number;
}> {
  return { success: false, error: "Deprecated. Use bulkImportRecords instead." };
}

export async function getImportBatches(...args: any[]): Promise<any> {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return { error: "Unauthorized" };
  }

  const imports = await prisma.dataImport.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { importedAt: "desc" },
  });

  // Map to batch format
  return imports.map((imp) => ({
    id: imp.id,
    fileName: imp.fileName,
    importedAt: imp.importedAt,
    studentCount: imp.recordCount,
    classAdmittedTo: "General",
  }));
}

export async function deleteImportBatch(id: string, ...args: any[]): Promise<{
  success?: any;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.organizationId) return { success: false, error: "Unauthorized" };

  try {
    await prisma.dataRecord.deleteMany({
      where: { importId: id },
    });
    await prisma.dataImport.delete({
      where: { id },
    });
    revalidatePath("/dashboard/data");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addSingleStudent(...args: any[]): Promise<{
  success?: any;
  error?: string;
}> {
  return { success: undefined, error: "Deprecated. Use addDataRecord instead." };
}

export async function editStudent(...args: any[]): Promise<{
  success?: any;
  error?: string;
}> {
  return { success: undefined, error: "Deprecated. Use updateDataRecord instead." };
}

export async function findSimilarValues(...args: any[]): Promise<any> {
  return { suggestions: [] };
}

export async function deleteStudentsRange(...args: any[]): Promise<{
  success?: any;
  error?: string;
  count?: number;
}> {
  return { success: true, count: 0 };
}

export async function deleteStudentsBySTAS(...args: any[]): Promise<{
  success?: any;
  error?: string;
}> {
  return { success: true };
}
