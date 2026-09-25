import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { createDocument, transitionDocumentStatus } from "@/lib/services/document-service";

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response!;
  }

  // Check scopes
  if (auth.scopes && !auth.scopes.includes("generate_documents")) {
    return NextResponse.json(
      { error: "Forbidden. API key lacks 'generate_documents' scope." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { templateId, definitionId, recordId, data, dynamicFields, autoIssue } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Missing required field: templateId" },
        { status: 400 }
      );
    }

    const orgId = auth.organizationId;

    // Resolve data
    let recordData: Record<string, unknown> = {};
    if (recordId) {
      const record = await prisma.dataRecord.findUnique({
        where: { id: recordId },
      });
      if (!record || record.organizationId !== orgId) {
        return NextResponse.json({ error: "Record not found or access denied." }, { status: 404 });
      }
      recordData = JSON.parse(record.data);
    } else if (data) {
      recordData = data;
    }

    if (dynamicFields) {
      recordData = { ...recordData, ...dynamicFields };
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

    // Fetch template
    const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.fieldMappings) {
      return NextResponse.json({ error: "Template not found or has no field mappings." }, { status: 404 });
    }

    // Create Document record
    const document = await createDocument({
      organizationId: orgId,
      recordId,
      definitionId,
      templateId,
      dataSnapshot: recordData,
      dynamicFields,
    });

    const blueprint = JSON.parse(template.fieldMappings);

    // Build the flat data dictionary for rendering
    const flatData: Record<string, string> = {};
    for (const [key, value] of Object.entries(recordData)) {
      flatData[key] = String(value ?? "");
    }
    flatData["organizationName"] = org.name;
    flatData["organizationAddress"] = org.address || "";
    flatData["registrationNumber"] = org.registrationNumber || "";

    const res = await fetch("http://127.0.0.1:8001/api/generate-overlay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blueprint: {
          template_id: template.id,
          source_image_url: template.backgroundImageUrl,
          image_width: blueprint.imageWidth,
          image_height: blueprint.imageHeight,
          fields: blueprint.fields || [],
        },
        record_data: flatData,
        debug_guides: false,
        include_background: true,
      }),
    });

    if (!res.ok) throw new Error("Failed to generate PDF overlay from python backend");
    const genData = await res.json();

    const pdfRes = await fetch(`http://127.0.0.1:8001${genData.download_url}`);
    const arrayBuffer = await pdfRes.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    // Transition status
    await transitionDocumentStatus({
      documentId: document.id,
      organizationId: orgId,
      newStatus: "GENERATED",
    });

    if (autoIssue !== false) {
      await transitionDocumentStatus({
        documentId: document.id,
        organizationId: orgId,
        newStatus: "ISSUED",
      });
    }

    const base64 = Buffer.from(pdfBytes).toString("base64");

    return NextResponse.json({
      success: true,
      documentId: document.id,
      documentNumber: document.documentNumber,
      verificationUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/v/${document.qrValidationKey}`,
      pdfBase64: base64,
    });
  } catch (error: any) {
    console.error("API DOCUMENT GENERATION ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
