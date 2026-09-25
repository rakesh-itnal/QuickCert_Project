import { prisma } from "@/lib/prisma";
import { createAuditEvent } from "./audit-service";
import type { SchemaFieldDefinition } from "@/lib/types";

// =============================================================================
// Data Schema Service — Dynamic field definitions per organization
// =============================================================================

/**
 * Create a new data schema for an organization
 */
export async function createDataSchema(params: {
  name: string;
  description?: string;
  fields: SchemaFieldDefinition[];
  organizationId: string;
  actorId?: string;
  actorName?: string;
}) {
  const schema = await prisma.dataSchema.create({
    data: {
      name: params.name,
      description: params.description || null,
      fields: JSON.stringify(params.fields),
      organizationId: params.organizationId,
    },
  });

  await createAuditEvent({
    action: "SCHEMA_CREATED",
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorName: params.actorName,
    metadata: { schemaId: schema.id, schemaName: params.name, fieldCount: params.fields.length },
  });

  return schema;
}

/**
 * Get all schemas for an organization
 */
export async function getSchemas(organizationId: string) {
  const schemas = await prisma.dataSchema.findMany({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return schemas.map((schema) => ({
    ...schema,
    fields: JSON.parse(schema.fields) as SchemaFieldDefinition[],
  }));
}

/**
 * Get a schema by ID
 */
export async function getSchemaById(schemaId: string, organizationId: string) {
  const schema = await prisma.dataSchema.findUnique({
    where: { id: schemaId },
  });

  if (!schema || schema.organizationId !== organizationId) return null;

  return {
    ...schema,
    fields: JSON.parse(schema.fields) as SchemaFieldDefinition[],
  };
}

// =============================================================================
// Data Record Service — Generic business entity management
// =============================================================================

/**
 * Create a single data record
 */
export async function createDataRecord(params: {
  uniqueId: string;
  displayName?: string;
  data: Record<string, unknown>;
  schemaId?: string;
  organizationId: string;
  importId?: string;
  actorId?: string;
  actorName?: string;
}) {
  const record = await prisma.dataRecord.create({
    data: {
      uniqueId: params.uniqueId,
      displayName: params.displayName || null,
      data: JSON.stringify(params.data),
      schemaId: params.schemaId || null,
      organizationId: params.organizationId,
      importId: params.importId || null,
    },
  });

  if (!params.importId) {
    // Only audit individual creates, not bulk imports (import has its own event)
    await createAuditEvent({
      action: "RECORD_CREATED",
      organizationId: params.organizationId,
      actorId: params.actorId,
      actorName: params.actorName,
      metadata: { recordId: record.id, uniqueId: params.uniqueId },
    });
  }

  return record;
}

/**
 * Upsert a data record (create or update based on uniqueId)
 */
export async function upsertDataRecord(params: {
  uniqueId: string;
  displayName?: string;
  data: Record<string, unknown>;
  schemaId?: string;
  organizationId: string;
  importId?: string;
}) {
  return prisma.dataRecord.upsert({
    where: {
      organizationId_uniqueId: {
        organizationId: params.organizationId,
        uniqueId: params.uniqueId,
      },
    },
    update: {
      displayName: params.displayName || undefined,
      data: JSON.stringify(params.data),
      schemaId: params.schemaId || undefined,
      importId: params.importId || undefined,
    },
    create: {
      uniqueId: params.uniqueId,
      displayName: params.displayName || null,
      data: JSON.stringify(params.data),
      schemaId: params.schemaId || null,
      organizationId: params.organizationId,
      importId: params.importId || null,
    },
  });
}

/**
 * Get data records for an organization with optional filtering
 */
export async function getDataRecords(params: {
  organizationId: string;
  schemaId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {
    organizationId: params.organizationId,
  };

  if (params.schemaId) where.schemaId = params.schemaId;

  if (params.search) {
    where.OR = [
      { uniqueId: { contains: params.search } },
      { displayName: { contains: params.search } },
      { data: { contains: params.search } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.dataRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.dataRecord.count({ where }),
  ]);

  return {
    records: records.map((r) => ({
      ...r,
      data: JSON.parse(r.data) as Record<string, unknown>,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
    })),
    total,
  };
}

/**
 * Get a single data record by ID
 */
export async function getDataRecordById(
  recordId: string,
  organizationId: string
) {
  const record = await prisma.dataRecord.findUnique({
    where: { id: recordId },
  });

  if (!record || record.organizationId !== organizationId) return null;

  return {
    ...record,
    data: JSON.parse(record.data) as Record<string, unknown>,
    metadata: record.metadata ? JSON.parse(record.metadata) : {},
  };
}

/**
 * Import data records from a parsed matrix (CSV/XLSX)
 */
export async function importDataRecords(params: {
  fileName: string;
  fileSize?: number;
  records: Array<{ uniqueId: string; displayName?: string; data: Record<string, unknown> }>;
  schemaId?: string;
  organizationId: string;
  actorId?: string;
  actorName?: string;
}) {
  // Create import batch record
  const dataImport = await prisma.dataImport.create({
    data: {
      fileName: params.fileName,
      fileSize: params.fileSize || null,
      recordCount: params.records.length,
      schemaId: params.schemaId || null,
      organizationId: params.organizationId,
    },
  });

  // Upsert all records in a transaction
  await prisma.$transaction(
    params.records.map((record) =>
      prisma.dataRecord.upsert({
        where: {
          organizationId_uniqueId: {
            organizationId: params.organizationId,
            uniqueId: record.uniqueId,
          },
        },
        update: {
          displayName: record.displayName || undefined,
          data: JSON.stringify(record.data),
          schemaId: params.schemaId || undefined,
          importId: dataImport.id,
        },
        create: {
          uniqueId: record.uniqueId,
          displayName: record.displayName || null,
          data: JSON.stringify(record.data),
          schemaId: params.schemaId || null,
          organizationId: params.organizationId,
          importId: dataImport.id,
        },
      })
    )
  );

  await createAuditEvent({
    action: "DATA_IMPORTED",
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorName: params.actorName,
    metadata: {
      importId: dataImport.id,
      fileName: params.fileName,
      recordCount: params.records.length,
      schemaId: params.schemaId,
    },
  });

  return {
    importId: dataImport.id,
    recordCount: params.records.length,
  };
}

/**
 * Get all data imports for an organization
 */
export async function getDataImports(organizationId: string) {
  return prisma.dataImport.findMany({
    where: { organizationId },
    orderBy: { importedAt: "desc" },
    include: {
      _count: { select: { records: true } },
    },
  });
}

/**
 * Delete an import and its associated records
 */
export async function deleteDataImport(
  importId: string,
  organizationId: string,
  actorId?: string,
  actorName?: string
) {
  const batch = await prisma.dataImport.findUnique({
    where: { id: importId },
  });

  if (!batch || batch.organizationId !== organizationId) {
    return { error: "Import not found or access denied." };
  }

  // Delete all records from this import
  const deleted = await prisma.dataRecord.deleteMany({
    where: { importId },
  });

  // Delete the import record
  await prisma.dataImport.delete({ where: { id: importId } });

  await createAuditEvent({
    action: "DATA_IMPORTED",
    organizationId,
    actorId,
    actorName,
    metadata: {
      importId,
      action: "deleted",
      recordsDeleted: deleted.count,
    },
  });

  return { success: true, deletedCount: deleted.count };
}
