import { prisma } from "@/lib/prisma";
import { createAuditEvent } from "./audit-service";
import type { OrganizationData } from "@/lib/types";

/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<OrganizationData | null> {
  const org = await prisma.organization.findUnique({
    where: { id },
  });
  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    address: org.address,
    country: org.country,
    timezone: org.timezone,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    industry: org.industry,
    orgType: org.orgType,
    registrationNumber: org.registrationNumber,
    idFormat: org.idFormat,
    subscriptionStatus: org.subscriptionStatus,
  };
}

/**
 * Update organization settings
 */
export async function updateOrganization(
  id: string,
  data: Partial<Omit<OrganizationData, "id" | "slug">>,
  actorId?: string,
  actorName?: string
): Promise<OrganizationData> {
  const updated = await prisma.organization.update({
    where: { id },
    data: {
      name: data.name,
      logoUrl: data.logoUrl,
      address: data.address,
      country: data.country,
      timezone: data.timezone,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      industry: data.industry,
      orgType: data.orgType,
      registrationNumber: data.registrationNumber,
      idFormat: data.idFormat,
      subscriptionStatus: data.subscriptionStatus,
    },
  });

  await createAuditEvent({
    action: "ORGANIZATION_UPDATED",
    organizationId: id,
    actorId,
    actorName,
    metadata: { updatedFields: Object.keys(data) },
  });

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    logoUrl: updated.logoUrl,
    address: updated.address,
    country: updated.country,
    timezone: updated.timezone,
    contactEmail: updated.contactEmail,
    contactPhone: updated.contactPhone,
    industry: updated.industry,
    orgType: updated.orgType,
    registrationNumber: updated.registrationNumber,
    idFormat: updated.idFormat,
    subscriptionStatus: updated.subscriptionStatus,
  };
}
