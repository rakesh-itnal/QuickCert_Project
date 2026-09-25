import { prisma } from "@/lib/prisma";
import { createAuditEvent } from "./audit-service";
import type { DocumentTemplateData } from "@/lib/types";

/**
 * Get templates for an organization
 */
export async function getTemplates(organizationId: string): Promise<DocumentTemplateData[]> {
  const templates = await prisma.documentTemplate.findMany({
    where: {
      OR: [
        { organizationId },
        { organizationId: null }, // Global defaults
      ],
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    version: t.version,
    isActive: t.isActive,
    backgroundImageUrl: t.backgroundImageUrl,
    fieldMappings: t.fieldMappings,
    organizationId: t.organizationId,
  }));
}

/**
 * Update template field mappings and create a snapshot version
 */
export async function updateTemplateMappings(params: {
  templateId: string;
  organizationId: string;
  fieldMappings: Record<string, unknown>;
  changelog?: string;
  actorId?: string;
  actorName?: string;
}) {
  const template = await prisma.documentTemplate.findUnique({
    where: { id: params.templateId },
  });

  if (!template || (template.organizationId && template.organizationId !== params.organizationId)) {
    throw new Error("Template not found or access denied.");
  }

  const nextVersion = template.version + 1;
  const mappingsString = JSON.stringify(params.fieldMappings);

  // Update template and create TemplateVersion in a transaction
  const [updatedTemplate] = await prisma.$transaction([
    prisma.documentTemplate.update({
      where: { id: params.templateId },
      data: {
        fieldMappings: mappingsString,
        version: nextVersion,
      },
    }),
    prisma.templateVersion.create({
      data: {
        templateId: params.templateId,
        versionNumber: template.version,
        fieldMappings: template.fieldMappings,
        backgroundImageUrl: template.backgroundImageUrl,
        changelog: params.changelog || `Updated to version ${template.version}`,
      },
    }),
  ]);

  await createAuditEvent({
    action: "TEMPLATE_UPDATED",
    organizationId: params.organizationId,
    actorId: params.actorId,
    actorName: params.actorName,
    metadata: {
      templateId: params.templateId,
      newVersion: nextVersion,
    },
  });

  return updatedTemplate;
}
