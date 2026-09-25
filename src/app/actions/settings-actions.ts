"use server"

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateOrganizationSettings(prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return { error: "Unauthorized access. Please log in." };
    }

    const name = formData.get("name") as string;
    const registrationNumber = formData.get("registrationNumber") as string || formData.get("govRegNumber") as string;
    const address = formData.get("address") as string;
    const idFormat = formData.get("idFormat") as string || formData.get("studentIdFormat") as string;
    const industry = formData.get("industry") as string;
    const orgType = formData.get("orgType") as string;
    const contactEmail = formData.get("contactEmail") as string;
    const contactPhone = formData.get("contactPhone") as string;

    if (!name || name.trim() === "") {
        return { error: "Organization Name cannot be empty." };
    }

    await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        name,
        registrationNumber: registrationNumber || null,
        address: address || null,
        idFormat: idFormat || "REC-{AUTO}",
        industry: industry || "General",
        orgType: orgType || "Company",
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
      }
    });

    revalidatePath("/dashboard/settings");
    return { success: "Organization settings updated successfully!" };

  } catch (error: any) {
    return { error: "Critical database error updating settings." };
  }
}

// Backward compatible alias
export const updateInstituteSettings = updateOrganizationSettings;
