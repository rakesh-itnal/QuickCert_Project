import { NextRequest, NextResponse } from "next/server";
import { generateCertificatePDF } from "@/lib/pdf-generator";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let type = searchParams.get("type");
  let id = searchParams.get("id");

  // Fix: UI passes `type={customTemplateId}` for the Demo button
  if (type && !type.startsWith("STUDY_") && !id) {
    id = type;
  }

  if (!type && !id) {
    return new NextResponse("Missing template type or ID", { status: 400 });
  }

  const fakeData = {
    name: "John Doe",
    studentName: "John Doe",
    fatherName: "Richard Doe",
    motherName: "Jane Doe",
    dob: "01-01-2005",
    gender: "Male",
    caste: "General",
    motherTongue: "English",
    satsNumber: "STS-999999",
    admissionNumber: "ADM-9999",
    dobWords: "FIRST JANUARY TWO THOUSAND FIVE",
    nationality: "Indian",
    religion: "Hindu",
    
    studiedFromClass: "PUC-I",
    studiedToClass: "PUC-II",
    academicYear: "2023-2024",
    academicYearFrom: "2023",
    academicYearTo: "2024",

    instituteName: "Demo College of Arts & Science",
    instituteAddress: "123 College Road, Knowledge City",
    govRegNumber: "REG-12345",

    certificateType: type || "CUSTOM",
    issueDate: new Date().toLocaleDateString("en-GB"),
    qrValidationKey: "DEMO-KEY-123",
    qrVerifyBaseUrl: "http://localhost:3000",
  };

  try {
    // 1. If an explicit Template ID is requested, fetch it
    if (id) {
      const template = await prisma.documentTemplate.findUnique({
        where: { id }
      });
      
      // Use the new FastAPI backend for custom templates
      if (template && template.fieldMappings) {
         const blueprint = JSON.parse(template.fieldMappings);

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
             record_data: fakeData,
             debug_guides: false,
             include_background: true,
           }),
         });

         if (!res.ok) {
           throw new Error("Failed to generate PDF from FastAPI backend");
         }
         
         const data = await res.json();
         const pdfRes = await fetch(`http://127.0.0.1:8001${data.download_url}`);
         const arrayBuffer = await pdfRes.arrayBuffer();
         const pdfBytes = new Uint8Array(arrayBuffer);
         
         return new NextResponse(pdfBytes as any, {
           headers: {
             "Content-Type": "application/pdf",
             "Content-Disposition": `inline; filename="demo-${template.name.replace(/\s+/g, '_')}.pdf"`,
           },
         });
      }
    }

    // 2. Fallback to standard PDF generator for legacy built-in types (e.g. STUDY_A)
    const pdfBytes = await generateCertificatePDF(fakeData as any);
    const buffer = Buffer.from(pdfBytes);
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="demo-${type}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation/AI Engine error:", error);
    return new NextResponse(`Failed to generate PDF preview: ${error.message}`, { status: 500 });
  }
}
