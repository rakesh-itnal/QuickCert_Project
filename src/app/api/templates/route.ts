import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

// GET: Fetch all custom templates for the organization
export async function GET() {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ templates: [] }, { status: 401 });
  }

  const templates = await prisma.documentTemplate.findMany({
    where: {
      OR: [
        { organizationId: session.organizationId },
        { organizationId: null }, // Global defaults
      ],
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ templates });
}

// POST: Upload a new custom template
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const templateName = formData.get("name") as string;
    const templateType = formData.get("type") as string;

    if (!file || !templateName || !templateType) {
      return NextResponse.json(
        { error: "Missing required fields: file, name, and type are required." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Upload a PDF, PNG, JPG, or WebP file." },
        { status: 400 }
      );
    }

    // Size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 5MB allowed." },
        { status: 400 }
      );
    }

    // Save file to public/uploads/templates/
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "pdf";
    const safeName = templateName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const fileName = `${session.organizationId}_${safeName}_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "templates");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Save record in the database
    const template = await prisma.documentTemplate.create({
      data: {
        name: templateName,
        category: templateType.toUpperCase(),
        backgroundImageUrl: `/uploads/templates/${fileName}`,
        fieldMappings: JSON.stringify({ fields: [], version: 1 }),
        organizationId: session.organizationId,
      },
    });

    return NextResponse.json({
      success: true,
      template,
      message: `Template "${templateName}" uploaded successfully.`,
    });
  } catch (error: any) {
    console.error("TEMPLATE UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE: Remove a custom template
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("id");

  if (!templateId) {
    return NextResponse.json({ error: "Template ID required" }, { status: 400 });
  }

  // Verify ownership
  const template = await prisma.documentTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || template.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Template not found or access denied" }, { status: 404 });
  }

  // Delete file from disk
  const filePath = path.join(process.cwd(), "public", template.backgroundImageUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete from DB
  await prisma.documentTemplate.delete({ where: { id: templateId } });

  return NextResponse.json({ success: true, message: "Template deleted." });
}

// PATCH: Update field mappings
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, fieldMappings } = await request.json();

    if (!id || !fieldMappings) {
      return NextResponse.json(
        { error: "Template ID and fieldMappings are required." },
        { status: 400 }
      );
    }

    const template = await prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template || template.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Template not found or access denied" }, { status: 404 });
    }

    const updated = await prisma.documentTemplate.update({
      where: { id },
      data: {
        fieldMappings: JSON.stringify(fieldMappings),
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error("TEMPLATE PATCH ERROR:", error);
    return NextResponse.json(
      { error: `Failed to update mappings: ${error.message}` },
      { status: 500 }
    );
  }
}
