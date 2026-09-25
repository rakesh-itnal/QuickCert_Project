import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ students: [] }, { status: 401 });
  }

  const records = await prisma.dataRecord.findMany({
    where: { organizationId: session.organizationId },
    select: {
      id: true,
      uniqueId: true,
      displayName: true,
      data: true,
    },
    orderBy: { uniqueId: "asc" },
  });

  // Map to student format for backward compatibility in standard components
  const students = records.map((record) => {
    const data = record.data ? JSON.parse(record.data) : {};
    return {
      id: record.id,
      name: record.displayName || data.name || record.uniqueId,
      satsNumber: record.uniqueId,
      classAdmittedTo: data.classAdmittedTo || data.department || "General",
      fatherName: data.fatherName || data.inspector || "N/A",
    };
  });

  return NextResponse.json({ students });
}
