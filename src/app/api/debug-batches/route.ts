import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allBatches = await prisma.dataImport.findMany({
      select: { id: true, fileName: true, organizationId: true }
    });

    const userBatches = await prisma.dataImport.findMany({
      where: { organizationId: session.organizationId }
    });

    return NextResponse.json({
      session,
      allBatchesCount: allBatches.length,
      allBatches,
      userBatchesCount: userBatches.length,
      userBatches
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
