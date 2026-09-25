"use server"

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, setupSession, clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function registerOrganization(prevState: any, formData: FormData) {
  try {
    const organizationName = formData.get("organizationName") as string || formData.get("instituteName") as string;
    const adminName = formData.get("adminName") as string || formData.get("principalName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const industry = formData.get("industry") as string || "General";

    if (!organizationName || !email || !password || password.length < 6) {
      return { error: "Please fill out all fields. Password must be 6+ characters." };
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { error: "This email is already registered to an organization." };

    // Create the Organization and the Admin user atomically
    const hashedPassword = await hashPassword(password);
    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

    const newOrg = await prisma.organization.create({
      data: {
        name: organizationName,
        slug: slug,
        industry: industry,
        users: {
          create: {
            email,
            name: adminName,
            passwordHash: hashedPassword,
            role: "OWNER"
          }
        }
      },
      include: {
        users: true
      }
    });

    // Create the secure session cookie
    const newlyCreatedUser = newOrg.users[0];
    await setupSession({
      userId: newlyCreatedUser.id,
      organizationId: newOrg.id,
      instituteId: newOrg.id, // backward compat
      role: newlyCreatedUser.role
    });

  } catch (error: any) {
    return { error: "An unexpected error occurred during registration. Please try again." };
  }

  // Redirect to dashboard (Must be caught outside of try-catch block in Next.js)
  redirect("/dashboard");
}

// Backward compatible alias
export const registerInstitute = registerOrganization;

export async function loginOrganization(prevState: any, formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return { error: "Email and password are required." };

    // Fetch user and verify their password hash
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { error: "Invalid credentials. Unauthorized access." };

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) return { error: "Invalid credentials. Unauthorized access." };

    // Build the secure session
    await setupSession({
      userId: user.id,
      organizationId: user.organizationId,
      instituteId: user.organizationId, // backward compat
      role: user.role
    });
    
  } catch (error: any) {
     return { error: "Failed to verify credentials." };
  }

  // Success, redirect to the dashboard
  redirect("/dashboard");
}

// Backward compatible alias
export const loginInstitute = loginOrganization;

export async function logoutOrganization() {
  // Clear the session cookie
  await clearSession();
  
  // Redirect to login page
  redirect("/login");
}

// Backward compatible alias
export const logoutInstitute = logoutOrganization;
