import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ plan: "free" });

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { subscriptionStatus: true, subscriptionEndsAt: true },
  });

  if (!org) return NextResponse.json({ plan: "free" });

  // Check if the plan has expired
  const isExpired = org.subscriptionEndsAt && new Date() > new Date(org.subscriptionEndsAt);
  const effectivePlan = isExpired ? "free" : (org.subscriptionStatus || "free");

  return NextResponse.json({
    plan: effectivePlan,
    expiresAt: org.subscriptionEndsAt,
    isExpired,
  });
}
