import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { customColumns: true }
    });

    const columns = organization?.customColumns ? JSON.parse(organization.customColumns) : [];
    return NextResponse.json({ columns });
  } catch (error: any) {
    console.error("Failed to get custom columns:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { columnName } = await req.json();
    if (!columnName || typeof columnName !== "string") {
      return NextResponse.json({ error: "Invalid column name" }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { customColumns: true }
    });

    const columns = organization?.customColumns ? JSON.parse(organization.customColumns) : [];
    if (!columns.includes(columnName)) {
      columns.push(columnName);
      await prisma.organization.update({
        where: { id: session.organizationId },
        data: { customColumns: JSON.stringify(columns) }
      });
    }

    return NextResponse.json({ success: true, columns });
  } catch (error: any) {
    console.error("Failed to add custom column:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
