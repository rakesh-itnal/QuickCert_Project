import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding QuickCert V2 demo verticals...");

  // 1. Create Demo Organization
  const org = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Industrial Corporation",
      slug: "acme-corp",
      industry: "Manufacturing",
      orgType: "Company",
      registrationNumber: "ACME-IND-9922",
      address: "Industrial Area Phase II, Bangalore",
      country: "India",
      timezone: "Asia/Kolkata",
    },
  });
  console.log("Created Organization:", org.name);

  // 2. Create Admin User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password", salt);

  const user = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      name: "Jane Smith",
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
    },
  });
  console.log("Created Owner User:", user.email);

  // 3. Create Manufacturing QC DataSchema
  const qcSchema = await prisma.dataSchema.create({
    data: {
      name: "Quality Inspection",
      description: "Fields used for manufacturing batch quality verification",
      fields: JSON.stringify([
        { name: "partNumber", label: "Part Number", type: "text", required: true },
        { name: "batchNumber", label: "Batch Number", type: "text", required: true },
        { name: "inspector", label: "Inspector Name", type: "text", required: true },
        { name: "inspectionDate", label: "Inspection Date", type: "date", required: true },
        { name: "result", label: "Result status", type: "text", required: true },
      ]),
      organizationId: org.id,
    },
  });
  console.log("Created DataSchema:", qcSchema.name);

  // 4. Create HR DataSchema
  const hrSchema = await prisma.dataSchema.create({
    data: {
      name: "HR Employee Record",
      description: "Employee details for letter of experience / promotion",
      fields: JSON.stringify([
        { name: "employeeId", label: "Employee ID", type: "text", required: true },
        { name: "name", label: "Employee Name", type: "text", required: true },
        { name: "designation", label: "Designation", type: "text", required: true },
        { name: "joiningDate", label: "Joining Date", type: "date", required: true },
        { name: "department", label: "Department", type: "text", required: true },
      ]),
      organizationId: org.id,
    },
  });
  console.log("Created DataSchema:", hrSchema.name);

  // 5. Create Document Definitions
  const qcDef = await prisma.documentDefinition.create({
    data: {
      name: "Quality Inspection Certificate",
      description: "Official certificate confirming part compliance",
      category: "Quality",
      schemaId: qcSchema.id,
      organizationId: org.id,
    },
  });

  const hrDef = await prisma.documentDefinition.create({
    data: {
      name: "Certificate of Employment",
      description: "Standard employment letter",
      category: "HR",
      schemaId: hrSchema.id,
      organizationId: org.id,
    },
  });
  console.log("Created Document Definitions:", qcDef.name, "and", hrDef.name);

  // 6. Create sample DataRecords
  const qcRecord1 = await prisma.dataRecord.create({
    data: {
      uniqueId: "PART-8899-X1",
      displayName: "Batch 8899 Inspection",
      schemaId: qcSchema.id,
      organizationId: org.id,
      data: JSON.stringify({
        partNumber: "PART-8899",
        batchNumber: "BATCH-A5",
        inspector: "David Vance",
        inspectionDate: "2026-08-15",
        result: "PASSED (Compliance Score 98%)",
      }),
    },
  });

  const qcRecord2 = await prisma.dataRecord.create({
    data: {
      uniqueId: "PART-4433-Y2",
      displayName: "Batch 4433 Inspection",
      schemaId: qcSchema.id,
      organizationId: org.id,
      data: JSON.stringify({
        partNumber: "PART-4433",
        batchNumber: "BATCH-C1",
        inspector: "Sarah Connor",
        inspectionDate: "2026-08-18",
        result: "FAILED (Structural anomaly detected)",
      }),
    },
  });

  const hrRecord1 = await prisma.dataRecord.create({
    data: {
      uniqueId: "EMP-2490",
      displayName: "Markus Aurelius",
      schemaId: hrSchema.id,
      organizationId: org.id,
      data: JSON.stringify({
        employeeId: "EMP-2490",
        name: "Markus Aurelius",
        designation: "Principal Engineer",
        joiningDate: "2021-04-12",
        department: "Core Engineering",
      }),
    },
  });
  console.log("Created DataRecords successfully!");

  // 7. Create templates (DocumentTemplate)
  const qcTemplate = await prisma.documentTemplate.create({
    data: {
      name: "Standard Business Blue Background",
      category: "QUALITY",
      backgroundImageUrl: "/uploads/templates/default_blank.png", // fallback placeholder
      fieldMappings: JSON.stringify({
        imageWidth: 1000,
        imageHeight: 700,
        engine: "gemini-hitl",
        fields: [
          { id: "f1", label: "Subject Name", type: "line", bbox: [300, 200, 330, 800], mapping_column: "name", manual_text: "" },
          { id: "f2", label: "Unique ID", type: "line", bbox: [360, 200, 390, 450], mapping_column: "uniqueId", manual_text: "" },
          { id: "f3", label: "Details", type: "box", bbox: [430, 200, 520, 800], mapping_column: "details", manual_text: "" },
        ],
      }),
      organizationId: org.id,
    },
  });

  // 8. Create sample Documents (Generated & Revoked)
  await prisma.document.create({
    data: {
      documentNumber: "DOC-2026-000001",
      documentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      status: "VALID",
      issueDate: new Date(),
      dataSnapshot: JSON.stringify({
        name: "Markus Aurelius",
        uniqueId: "EMP-2490",
        details: "Certificate of Employment for Markus Aurelius as Principal Engineer.",
      }),
      recordId: hrRecord1.id,
      definitionId: hrDef.id,
      templateId: qcTemplate.id,
      organizationId: org.id,
    },
  });

  await prisma.document.create({
    data: {
      documentNumber: "DOC-2026-000002",
      documentHash: "ca978112ca1bbdcafac231b39a20602ec91d8b903875324a4c820ff54486677c",
      status: "REVOKED",
      issueDate: new Date(),
      revokedAt: new Date(),
      revokedReason: "Defective component recalled under batch 4433.",
      dataSnapshot: JSON.stringify({
        name: "Batch 4433 Inspection",
        uniqueId: "PART-4433-Y2",
        details: "Quality Inspection Certificate failed for batch 4433.",
      }),
      recordId: qcRecord2.id,
      definitionId: qcDef.id,
      templateId: qcTemplate.id,
      organizationId: org.id,
    },
  });
  console.log("Created Documents successfully!");

  console.log("QuickCert V2 Seeding completed successfully! Login with: admin@company.com / password");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
