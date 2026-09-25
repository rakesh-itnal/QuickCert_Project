// End-to-end test: Insert sample Karnataka PU students and generate certificates
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Sample Karnataka PU College student data (realistic)
const sampleStudents = [
  {
    name: "Rakesh Shidaray Itnal",
    fatherName: "Shidaray Itnal",
    motherName: "Savitri Itnal",
    dob: new Date("2004-06-22"),
    gender: "Male",
    nationality: "Indian",
    caste: "Lingayat",
    motherTongue: "Kannada",
    satsNumber: "STS2024001",
    classAdmittedTo: "1st PUC",
    placeOfBirthVillage: "Handigund",
    placeOfBirthTaluka: "Chikodi",
    placeOfBirthDistrict: "Belagavi",
    mediumOfInstruction: "English"
  },
  {
    name: "Priya Basavaraj Patil",
    fatherName: "Basavaraj Patil",
    motherName: "Lakshmi Patil",
    dob: new Date("2005-03-15"),
    gender: "Female",
    nationality: "Indian",
    caste: "Maratha",
    motherTongue: "Kannada",
    satsNumber: "STS2024002",
    classAdmittedTo: "1st PUC",
    placeOfBirthVillage: "Nipani",
    placeOfBirthTaluka: "Chikodi",
    placeOfBirthDistrict: "Belagavi",
    mediumOfInstruction: "English"
  },
  {
    name: "Suresh Mallikarjun Gowda",
    fatherName: "Mallikarjun Gowda",
    motherName: "Annapurna Gowda",
    dob: new Date("2004-11-08"),
    gender: "Male",
    nationality: "Indian",
    caste: "Vokkaliga",
    motherTongue: "Kannada",
    satsNumber: "STS2024003",
    classAdmittedTo: "2nd PUC",
    placeOfBirthVillage: "Yallatti",
    placeOfBirthTaluka: "Rabkavi-Banhatti",
    placeOfBirthDistrict: "Bagalkote",
    mediumOfInstruction: "Kannada"
  }
];

async function main() {
  console.log("=== QuickCert End-to-End Certificate Test ===\n");

  // 1. Find or create a test institute
  let institute = await prisma.institute.findFirst();
  if (!institute) {
    institute = await prisma.institute.create({
      data: {
        name: "Konnur Science Pre-University College",
        slug: "konnur-science-pu",
        address: "Yallatti-587311, Tq. Rabkavi-Banhatti, Dist. Bagalkote",
        govRegNumber: "EB-0279",
        studentIdFormat: "KSPU-{AUTO}",
      },
    });
    console.log("Created test institute:", institute.name);
  } else {
    console.log("Using existing institute:", institute.name);
  }

  // 2. Insert sample students
  console.log("\nInserting sample students...");
  for (const studentData of sampleStudents) {
    await prisma.student.upsert({
      where: {
        instituteId_satsNumber: {
          instituteId: institute.id,
          satsNumber: studentData.satsNumber,
        },
      },
      update: { name: studentData.name },
      create: {
        ...studentData,
        instituteId: institute.id,
        admissionNumber: `KSPU-${studentData.satsNumber.slice(-3)}`,
      },
    });
    console.log(`  ✓ ${studentData.name} (${studentData.satsNumber})`);
  }

  // 3. Fetch a student to generate a certificate for
  const student = await prisma.student.findFirst({
    where: { instituteId: institute.id },
    include: { institute: true },
  });

  if (!student) {
    console.error("No student found!");
    return;
  }

  console.log(`\nGenerating certificate for: ${student.name}`);

  // 4. Create certificate record
  const certificate = await prisma.certificate.create({
    data: {
      type: "STUDY",
      studiedFromClass: "PUC-I",
      studiedToClass: "PUC-II",
      academicYear: "2023-24 to 2024-25",
      studentId: student.id,
      instituteId: institute.id,
    },
  });
  console.log(`  Certificate DB record created. QR Key: ${certificate.qrValidationKey}`);

  // 5. Generate the actual PDF
  // We need to use the compiled version, so let's use dynamic import
  // But since this is a test script, let's generate using pdf-lib directly
  const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
  const QRCode = require("qrcode");

  const A4W = 595.28;
  const A4H = 841.89;

  // Generate all 4 template types
  const templates = ["STUDY_A", "STUDY_B", "STUDY_C", "STUDY_KANNADA"];
  
  for (const templateType of templates) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`${templateType} - ${student.name}`);
    pdfDoc.setProducer("QuickCert SaaS Platform");

    const page = pdfDoc.addPage([A4W, A4H]);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.6, 0.6, 0.6);
    const borderGray = rgb(0.75, 0.75, 0.75);

    // Border
    page.drawRectangle({ x: 30, y: 30, width: A4W - 60, height: A4H - 60, borderColor: borderGray, borderWidth: 2 });
    page.drawRectangle({ x: 36, y: 36, width: A4W - 72, height: A4H - 72, borderColor: borderGray, borderWidth: 0.5 });

    const cx = A4W / 2;
    let y = A4H - 80;

    if (templateType === "STUDY_B") {
      // College Code
      page.drawText(`College Code : ${institute.govRegNumber || "EB-0279"}`, {
        x: 380, y: y + 15, size: 10, font: timesBold, color: black
      });

      // Institute Name (centered)
      const instName = institute.name.toUpperCase();
      const instW = timesBold.widthOfTextAtSize(instName, 15);
      page.drawText(instName, { x: (A4W - instW) / 2, y, size: 15, font: timesBold, color: black });
      y -= 18;

      const addr = institute.address || "";
      const addrW = timesRoman.widthOfTextAtSize(addr, 10);
      page.drawText(addr, { x: (A4W - addrW) / 2, y, size: 10, font: timesRoman, color: gray });
      y -= 20;

      page.drawLine({ start: { x: 50, y }, end: { x: A4W - 50, y }, thickness: 1, color: black });
      y -= 30;

      // Date
      const today = new Date().toLocaleDateString("en-GB");
      page.drawText(`Date : ${today}`, { x: 370, y, size: 11, font: timesRoman, color: black });
      y -= 40;

    } else if (templateType === "STUDY_KANNADA") {
      // Kannada title (romanized since we can't embed Kannada in standard fonts)
      const kTitle = "SHAALA DAAKHALATHI PRAMAANA PATRA";
      const kTitleW = timesBold.widthOfTextAtSize(kTitle, 16);
      page.drawText(kTitle, { x: (A4W - kTitleW) / 2, y, size: 16, font: timesBold, color: black });
      y -= 20;
      const kSub = "(School Admission Certificate - Kannada Format)";
      const kSubW = timesRoman.widthOfTextAtSize(kSub, 11);
      page.drawText(kSub, { x: (A4W - kSubW) / 2, y, size: 11, font: timesRoman, color: gray });
      y -= 50;
    } else {
      y -= 10;
    }

    // Title box
    const title = templateType === "STUDY_KANNADA" ? "ADMISSION CERTIFICATE" : "STUDY CERTIFICATE";
    const titleW = timesBold.widthOfTextAtSize(title, 22);
    page.drawRectangle({
      x: cx - titleW / 2 - 15, y: y - 8, width: titleW + 30, height: 32,
      borderColor: black, borderWidth: 1.5
    });
    page.drawText(title, { x: cx - titleW / 2, y, size: 22, font: timesBold, color: black });
    y -= 60;

    // Underline helper
    const drawField = (label, value, lx, ly, fieldX, fieldW) => {
      page.drawText(label, { x: lx, y: ly, size: 12, font: timesRoman, color: black });
      page.drawLine({ start: { x: fieldX, y: ly - 2 }, end: { x: fieldX + fieldW, y: ly - 2 }, thickness: 0.5, color: black });
      const vw = timesBold.widthOfTextAtSize(value, 13);
      page.drawText(value, { x: fieldX + (fieldW - vw) / 2, y: ly + 2, size: 13, font: timesBold, color: black });
    };

    // Body text
    const honorific = student.gender?.toLowerCase() === "female" ? "Kumari" : "Kumar";
    
    if (templateType === "STUDY_B") {
      // Konnur Science PU College style — detailed with mother tongue
      drawField(`This is to certify that ${honorific}`, student.name, 60, y, 290, 240);
      y -= 35;
      drawField("S/o / D/o", student.fatherName || "___", 115, y, 195, 250);
      y -= 35;
      
      page.drawText("has studied from", { x: 60, y, size: 12, font: timesRoman, color: black });
      drawField("", "PUC-I", 185, y, 185, 80);
      page.drawText("standard to", { x: 275, y, size: 12, font: timesRoman, color: black });
      drawField("", "PUC-II", 355, y, 355, 80);
      page.drawText("standard in our", { x: 445, y, size: 12, font: timesRoman, color: black });
      y -= 35;
      
      page.drawText("institution from", { x: 60, y, size: 12, font: timesRoman, color: black });
      drawField("", "2023-24", 170, y, 170, 90);
      page.drawText("to", { x: 270, y, size: 12, font: timesRoman, color: black });
      drawField("", "2024-25", 290, y, 290, 90);
      page.drawText("academic years.", { x: 390, y, size: 12, font: timesRoman, color: black });
      y -= 45;

      page.drawText("The mother tongue of the candidate is", { x: 100, y, size: 12, font: timesRoman, color: black });
      drawField("", student.motherTongue || "Kannada", 345, y, 345, 110);
      page.drawText("as per the", { x: 460, y, size: 11, font: timesRoman, color: black });
      y -= 25;
      page.drawText("admission register of the institution.", { x: 60, y, size: 12, font: timesRoman, color: black });

    } else {
      // Simple A/C style
      page.drawText(`This is to certify that Shri/ Kum.`, { x: 60, y, size: 12, font: timesRoman, color: black });
      drawField("", student.name, 280, y, 280, 250);
      y -= 35;
      drawField("S/o./ D/o", student.fatherName || "___", 60, y, 140, 200);
      page.drawText("has studied", { x: 350, y, size: 12, font: timesRoman, color: black });
      y -= 35;
      drawField("", "PUC-I", 60, y, 60, 80);
      page.drawText("standard in our institution during", { x: 155, y, size: 12, font: timesRoman, color: black });
      drawField("", "2023-24", 385, y, 385, 100);
      y -= 25;
      page.drawText("Academic year, as per the institution records.", { x: 60, y, size: 12, font: timesRoman, color: black });
    }

    y -= 40;
    page.drawText("The above details are true and correct to the best of my knowledge.", {
      x: 100, y, size: 11, font: timesRoman, color: black
    });

    // Reg No / Date
    y -= 35;
    page.drawText(`Reg No: ${institute.govRegNumber || "___"}`, { x: 60, y, size: 11, font: timesRoman, color: black });
    y -= 20;
    page.drawText(`Date: ${new Date().toLocaleDateString("en-GB")}`, { x: 60, y, size: 11, font: timesRoman, color: black });

    // Signature area
    page.drawText("Signature of", { x: 390, y: y + 40, size: 10, font: timesRoman, color: gray });
    page.drawText("Principal", { x: 400, y: y + 25, size: 12, font: timesBold, color: black });
    page.drawText("Head of the Institution", { x: 370, y: y + 10, size: 10, font: timesRoman, color: black });

    // Stamp placeholder
    y -= 50;
    page.drawCircle({
      x: 430, y: y, size: 38,
      borderColor: borderGray, borderWidth: 0.5, borderDashArray: [3, 3]
    });
    page.drawText("Place for", { x: 412, y: y + 5, size: 8, font: helvetica, color: lightGray });
    page.drawText("Stamp / Seal", { x: 405, y: y - 7, size: 8, font: helvetica, color: lightGray });

    // QR Code
    const verifyUrl = `http://localhost:3000/verify/${certificate.qrValidationKey}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 100, margin: 1, color: { dark: "#1e293b" } });
    const qrBase64 = qrDataUrl.split(",")[1];
    const qrBytes = Buffer.from(qrBase64, "base64");
    const qrImage = await pdfDoc.embedPng(qrBytes);
    page.drawImage(qrImage, { x: 60, y: 45, width: 65, height: 65 });
    page.drawText("Scan to verify authenticity", { x: 55, y: 37, size: 7, font: helvetica, color: lightGray });

    // Counter-signed section (bottom)
    page.drawLine({ start: { x: 50, y: 130 }, end: { x: A4W - 50, y: 130 }, thickness: 0.5, color: borderGray });
    page.drawText("COUNTERSIGNED BY ME", { x: 200, y: 115, size: 10, font: timesBold, color: black });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const outputDir = path.join(__dirname, "test_certificates");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
    const fileName = `${student.name.replace(/\s+/g, "_")}_${templateType}.pdf`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);
    console.log(`  ✓ Generated: ${filePath} (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
  }

  console.log("\n=== All certificates generated successfully! ===");
  console.log(`QR Verification URL: http://localhost:3000/verify/${certificate.qrValidationKey}`);
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
