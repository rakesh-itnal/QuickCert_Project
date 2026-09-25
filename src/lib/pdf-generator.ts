import "regenerator-runtime/runtime";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import * as fs from "fs";
import * as path from "path";

// A4 dimensions in points (72 points per inch)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const COLORS = {
  black: rgb(0, 0, 0),
  darkGray: rgb(0.2, 0.2, 0.2),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.6, 0.6, 0.6),
  blue: rgb(0.1, 0.2, 0.5),
  borderGray: rgb(0.75, 0.75, 0.75),
};

export interface CertificateData {
  // Student Info
  studentName: string;
  fatherName: string;
  motherName?: string;
  dob?: string;
  motherTongue?: string;
  gender?: string; // Kumar/Kumari derivation
  caste?: string;

  // Academic Info
  studiedFromClass: string;
  studiedToClass: string;
  academicYearFrom: string;
  academicYearTo: string;

  // Institute Info
  instituteName: string;
  instituteAddress?: string;
  govRegNumber?: string;

  // Certificate Metadata
  certificateType: string;
  issueDate: string;
  qrValidationKey: string;
  qrVerifyBaseUrl: string;

  // For Intelligent Templates
  customTemplate?: {
    backgroundImageUrl: string;
    fields: import("./template-types").FieldMapping[];
  };
}

/**
 * Text-Scaling Algorithm: Intelligently calculates the maximum font size
 * that fits within the bounded width constraint without overwriting lines.
 */
function getScaledFontSizeAndWidth(
  text: string,
  baseSize: number,
  maxWidth: number,
  font: any
): { size: number; textWidth: number } {
  let currentSize = baseSize;
  let textWidth = font.widthOfTextAtSize(text, currentSize);
  
  // Recursively step down the size until it fits
  while (textWidth > maxWidth && currentSize > 4) {
    currentSize -= 0.5;
    textWidth = font.widthOfTextAtSize(text, currentSize);
  }
  return { size: currentSize, textWidth };
}

// Convert hex strings to PDF-lib RGB colors
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? rgb(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      )
    : COLORS.black;
}

// ============================================================================
// TEMPLATE TYPE: Intelligent Custom Template Generator
// ============================================================================
async function generateCustomTemplate(
  pdfDoc: PDFDocument,
  data: CertificateData,
  qrImageBytes: Uint8Array
) {
  if (!data.customTemplate) throw new Error("Missing custom template mappings.");

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const { backgroundImageUrl, fields } = data.customTemplate;

  // Load background image
  const bgPath = path.join(process.cwd(), "public", backgroundImageUrl);
  if (fs.existsSync(bgPath)) {
    const bgBytes = fs.readFileSync(bgPath);
    let bgImage;
    if (bgPath.endsWith(".png")) bgImage = await pdfDoc.embedPng(bgBytes);
    else bgImage = await pdfDoc.embedJpg(bgBytes);
    
    // Draw image stretching to page
    page.drawImage(bgImage, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT });
  }

  // Embed fonts
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // To support generic custom extraction, fallback dictionary mapping:
  const dataDict: Record<string, string> = {
    studentName: data.studentName,
    fatherName: data.fatherName,
    motherName: data.motherName || "",
    dob: data.dob || "",
    gender: data.gender || "",
    caste: data.caste || "",
    motherTongue: data.motherTongue || "",
    studiedFromClass: data.studiedFromClass,
    studiedToClass: data.studiedToClass,
    academicYearFrom: data.academicYearFrom,
    academicYearTo: data.academicYearTo,
    instituteName: data.instituteName,
    issueDate: data.issueDate,
    govRegNumber: data.govRegNumber || "",
  };

  // Draw intelligent mapped fields
  for (const field of fields) {
    if (!field.fieldId) continue;
    
    // Get the value; skip if empty
    const rawValue = dataDict[field.fieldId];
    if (!rawValue) continue;
    const text = rawValue.toUpperCase();

    // Resolve font based on mapped family/weight
    let font = helvetica;
    if (field.fontFamily?.includes("Times")) {
      font = field.fontWeight === "bold" ? timesBold : timesRoman;
    } else if (field.fontWeight === "bold") {
      font = helveticaBold;
    }

    const fontColor = field.colorHex ? hexToRgb(field.colorHex) : COLORS.black;

    // Intelligent bounding box scaling
    const { size: finalFontSize, textWidth } = getScaledFontSizeAndWidth(
      text,
      field.fontSize || 14,
      field.width, // Target bounding width
      font
    );

    // Alignment Logic
    const pdfY = A4_HEIGHT - field.y - finalFontSize;
    
    let pdfX = field.x;
    if (field.alignment === "center") {
      pdfX = field.x + (field.width - textWidth) / 2;
    } else if (field.alignment === "right") {
      pdfX = field.x + field.width - textWidth;
    }

    page.drawText(text, {
      x: pdfX,
      y: pdfY,
      size: finalFontSize,
      font,
      color: fontColor,
    });
  }

  // Embed QR Verification
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrSize = 60;
  // Bottom left standard placement for Custom
  page.drawImage(qrImage, { x: 50, y: 30, width: qrSize, height: qrSize });
  page.drawText("Scan to verify", { x: 52, y: 22, size: 7, font: helvetica, color: COLORS.lightGray });
}


/**
 * Generate a QR code as a PNG data URL
 */
async function generateQRCode(url: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: 100,
    margin: 1,
    color: { dark: "#1e293b", light: "#ffffff" },
  });
  // Convert data URL to Uint8Array
  const base64 = dataUrl.split(",")[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Draw a decorative border around the certificate
 */
function drawBorder(page: any, width: number, height: number) {
  // Outer border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: COLORS.borderGray,
    borderWidth: 2,
  });
  // Inner border
  page.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: COLORS.borderGray,
    borderWidth: 0.5,
  });
}

/**
 * Draw a centered underlined text (for fill-in-the-blank fields)
 */
function drawUnderlinedField(
  page: any,
  text: string,
  x: number,
  y: number,
  width: number,
  font: any,
  fontSize: number
) {
  // Draw the underline
  page.drawLine({
    start: { x, y: y - 2 },
    end: { x: x + width, y: y - 2 },
    thickness: 0.5,
    color: COLORS.black,
  });
  // Draw the text centered on the underline
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textX = x + (width - textWidth) / 2;
  page.drawText(text, {
    x: textX,
    y: y + 2,
    size: fontSize,
    font,
    color: COLORS.black,
  });
}

// ============================================================================
// TEMPLATE TYPE A: Simple Study Certificate (Basic style)
// ============================================================================
async function generateStudyTypeA(
  pdfDoc: PDFDocument,
  data: CertificateData,
  qrImageBytes: Uint8Array
) {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  drawBorder(page, A4_WIDTH, A4_HEIGHT);

  const cx = A4_WIDTH / 2; // center x
  let y = A4_HEIGHT - 100;

  // Institute Name Header (Centered and Bold)
  const instNameText = data.instituteName.toUpperCase();
  const instNameWidth = timesBold.widthOfTextAtSize(instNameText, 18);
  page.drawText(instNameText, {
    x: (A4_WIDTH - instNameWidth) / 2,
    y,
    size: 18,
    font: timesBold,
    color: COLORS.black,
  });

  y -= 25;
  if (data.instituteAddress) {
    const addressWidth = timesRoman.widthOfTextAtSize(data.instituteAddress, 11);
    page.drawText(data.instituteAddress, {
      x: (A4_WIDTH - addressWidth) / 2,
      y,
      size: 11,
      font: timesRoman,
      color: COLORS.darkGray,
    });
    y -= 40;
  }

  // Title
  y -= 10;
  const title = "STUDY CERTIFICATE";
  const titleWidth = timesBold.widthOfTextAtSize(title, 22);
  // Draw title box
  page.drawRectangle({
    x: cx - titleWidth / 2 - 20,
    y: y - 10,
    width: titleWidth + 40,
    height: 38,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: COLORS.black,
    borderWidth: 1.5,
  });
  page.drawText(title, {
    x: cx - titleWidth / 2,
    y: y,
    size: 22,
    font: timesBold,
    color: COLORS.black,
  });

  y -= 80;

  // Certificate body text
  const honorific = data.gender?.toLowerCase() === "female" ? "Kum." : "Shri.";
  
  // Line 1: "This is to certify that Shri/ Kum. ___________"
  page.drawText(`This is to certify that ${honorific}`, {
    x: 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  const nameLabelWidth = timesRoman.widthOfTextAtSize(`This is to certify that ${honorific}`, 14);
  drawUnderlinedField(page, data.studentName.toUpperCase(), 60 + nameLabelWidth + 10, y, A4_WIDTH - (60 + nameLabelWidth + 10) - 60, timesBold, 15);

  y -= 45;

  // Line 2: "S/o / D/o ___________ has studied"
  const relation = data.gender?.toLowerCase() === "female" ? "D/o" : "S/o";
  page.drawText(`${relation}`, {
    x: 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  const relWidth = timesRoman.widthOfTextAtSize(`${relation}`, 14);
  drawUnderlinedField(page, data.fatherName.toUpperCase(), 60 + relWidth + 10, y, 250, timesBold, 15);
  
  const hasStudiedStr = "has studied";
  page.drawText(hasStudiedStr, {
    x: 60 + relWidth + 10 + 250 + 10, y, size: 14, font: timesRoman, color: COLORS.black,
  });

  y -= 45;

  // Line 3: Standard and Academic Year
  drawUnderlinedField(page, data.studiedFromClass, 60, y, 100, timesBold, 15);
  
  const standardStr = "standard in our institution during";
  page.drawText(standardStr, {
    x: 170, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  const stdWidth = timesRoman.widthOfTextAtSize(standardStr, 14);
  
  drawUnderlinedField(page, data.academicYearFrom, 170 + stdWidth + 10, y, 120, timesBold, 15);
  
  const academicStr = "academic";
  page.drawText(academicStr, {
    x: 170 + stdWidth + 10 + 120 + 10, y, size: 14, font: timesRoman, color: COLORS.black,
  });

  y -= 45;
  page.drawText("year, as per the institution records.", {
    x: 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });

  y -= 70;

  // Verification statement
  const verificationStr = "The above details are true and correct to the best of my knowledge.";
  const verifWidth = timesRoman.widthOfTextAtSize(verificationStr, 12);
  page.drawText(verificationStr, {
    x: (A4_WIDTH - verifWidth) / 2, y, size: 12, font: timesRoman, color: COLORS.black,
  });

  y -= 80;

  // Reg No and Date
  page.drawText(`Reg No : ${data.govRegNumber || "_________________"}`, {
    x: 60, y, size: 12, font: timesBold, color: COLORS.black,
  });

  y -= 30;
  page.drawText(`Date : ${data.issueDate}`, {
    x: 60, y, size: 12, font: timesBold, color: COLORS.black,
  });

  // Signature placeholder
  const sigText = "Signature of Head of the Institution";
  const sigWidth = timesBold.widthOfTextAtSize(sigText, 12);
  page.drawText(sigText, {
    x: A4_WIDTH - sigWidth - 60, y, size: 12, font: timesBold, color: COLORS.black,
  });

  // Stamp placeholder (dashed circle)
  y -= 80;
  page.drawText("( Place for Stamp / Seal )", {
    x: 370, y, size: 9, font: timesRoman, color: COLORS.lightGray,
  });
  page.drawCircle({
    x: 430, y: y - 30, size: 35,
    borderColor: COLORS.borderGray,
    borderWidth: 0.5,
    borderDashArray: [3, 3],
  });

  // Counter-signed section
  y -= 100;
  page.drawLine({
    start: { x: 60, y: y + 10 },
    end: { x: A4_WIDTH - 60, y: y + 10 },
    thickness: 0.5,
    color: COLORS.borderGray,
  });
  
  page.drawText("( Name in Block letters......................................................  )", {
    x: 160, y: y - 10, size: 10, font: timesRoman, color: COLORS.black,
  });

  y -= 35;
  page.drawText("COUNTER SIGNED", {
    x: 60, y, size: 10, font: timesBold, color: COLORS.black,
  });

  page.drawText("Signature", {
    x: 400, y, size: 10, font: timesRoman, color: COLORS.gray,
  });

  y -= 18;
  page.drawText("Address:__________________________________________", {
    x: 60, y, size: 10, font: timesRoman, color: COLORS.black,
  });

  page.drawText("Head of the Institution", {
    x: 380, y, size: 10, font: timesBold, color: COLORS.black,
  });

  y -= 18;
  page.drawText("Date:", {
    x: 60, y, size: 10, font: timesRoman, color: COLORS.black,
  });

  // QR Code in bottom-left
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  page.drawImage(qrImage, {
    x: 60,
    y: 45,
    width: 60,
    height: 60,
  });
  page.drawText("Scan to verify", {
    x: 62,
    y: 38,
    size: 7,
    font: helvetica,
    color: COLORS.lightGray,
  });
}

// ============================================================================
// TEMPLATE TYPE B: Detailed Study Certificate (Konnur Science PU College style)
// ============================================================================
async function generateStudyTypeB(
  pdfDoc: PDFDocument,
  data: CertificateData,
  qrImageBytes: Uint8Array
) {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  drawBorder(page, A4_WIDTH, A4_HEIGHT);

  let y = A4_HEIGHT - 80;

  // College Code top-right
  if (data.govRegNumber) {
    page.drawText(`College Code : ${data.govRegNumber}`, {
      x: A4_WIDTH - 200, y: y + 25, size: 11, font: timesBold, color: COLORS.black,
    });
  }

  // Institute Header — Professional Center Aligned
  const instName = data.instituteName.toUpperCase();
  const instWidth = timesBold.widthOfTextAtSize(instName, 22);
  page.drawText(instName, {
    x: (A4_WIDTH - instWidth) / 2,
    y,
    size: 22,
    font: timesBold,
    color: COLORS.blue,
  });

  y -= 25;
  if (data.instituteAddress) {
    const addrWidth = timesItalic.widthOfTextAtSize(data.instituteAddress, 12);
    page.drawText(data.instituteAddress, {
      x: (A4_WIDTH - addrWidth) / 2,
      y,
      size: 12,
      font: timesItalic,
      color: COLORS.darkGray,
    });
    y -= 20;
  }

  // Contact / website line
  page.drawLine({
    start: { x: 50, y },
    end: { x: A4_WIDTH - 50, y },
    thickness: 1.5,
    color: COLORS.blue,
  });

  y -= 35;

  // Date
  page.drawText(`Date : ${data.issueDate}`, {
    x: A4_WIDTH - 150, y, size: 12, font: timesBold, color: COLORS.black,
  });

  y -= 50;

  // Title
  const title = "STUDY CERTIFICATE";
  const titleWidth = timesBold.widthOfTextAtSize(title, 24);
  page.drawRectangle({
    x: (A4_WIDTH - titleWidth) / 2 - 20,
    y: y - 10,
    width: titleWidth + 40,
    height: 38,
    color: rgb(0.96, 0.96, 0.98),
    borderColor: COLORS.blue,
    borderWidth: 2,
  });
  page.drawText(title, {
    x: (A4_WIDTH - titleWidth) / 2,
    y,
    size: 24,
    font: timesBold,
    color: COLORS.black,
  });

  y -= 70;

  // Body
  const honorific = data.gender?.toLowerCase() === "female" ? "Kumari." : "Kumar.";

  page.drawText(`This is to certify that ${honorific}`, {
    x: 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  const nameLblWidth = timesRoman.widthOfTextAtSize(`This is to certify that ${honorific}`, 14);
  drawUnderlinedField(page, data.studentName.toUpperCase(), 60 + nameLblWidth + 10, y, A4_WIDTH - (60 + nameLblWidth + 10) - 60, timesBold, 15);

  y -= 45;
  const relText = data.gender?.toLowerCase() === "female" ? "D/o." : "S/o.";
  page.drawText(relText, {
    x: 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  const relW = timesRoman.widthOfTextAtSize(relText, 14);
  
  drawUnderlinedField(page, data.fatherName.toUpperCase(), 60 + relW + 10, y, 300, timesBold, 15);
  
  const hasStudiedW = timesRoman.widthOfTextAtSize("has studied from", 14);
  page.drawText("has studied from", {
    x: A4_WIDTH - hasStudiedW - 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });

  y -= 45;
  drawUnderlinedField(page, data.studiedFromClass, 60, y, 100, timesBold, 15);
  
  const stdToText = "standard to";
  page.drawText(stdToText, {
    x: 175, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  const stdToW = timesRoman.widthOfTextAtSize(stdToText, 14);
  
  drawUnderlinedField(page, data.studiedToClass, 175 + stdToW + 15, y, 100, timesBold, 15);
  
  const stdInOurText = "standard in our";
  page.drawText(stdInOurText, {
    x: A4_WIDTH - timesRoman.widthOfTextAtSize(stdInOurText, 14) - 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });

  y -= 45;
  page.drawText("institution from", {
    x: 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  const instFromW = timesRoman.widthOfTextAtSize("institution from", 14);
  
  drawUnderlinedField(page, data.academicYearFrom, 60 + instFromW + 10, y, 110, timesBold, 15);
  page.drawText("to", {
    x: 60 + instFromW + 10 + 110 + 10, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  drawUnderlinedField(page, data.academicYearTo, 60 + instFromW + 10 + 110 + 10 + 25, y, 110, timesBold, 15);
  
  const acadYearsText = "academic years.";
  page.drawText(acadYearsText, {
    x: A4_WIDTH - timesRoman.widthOfTextAtSize(acadYearsText, 14) - 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });

  y -= 60;

  // Mother tongue line
  const motherTongueStr = "The mother tongue of the candidate is";
  page.drawText(motherTongueStr, {
    x: 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });
  const mtWidth = timesRoman.widthOfTextAtSize(motherTongueStr, 14);
  drawUnderlinedField(page, data.motherTongue?.toUpperCase() || "KANNADA", 60 + mtWidth + 10, y, 150, timesBold, 15);
  
  const asPerText = "as per the";
  page.drawText(asPerText, {
    x: A4_WIDTH - timesRoman.widthOfTextAtSize(asPerText, 14) - 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });

  y -= 40;
  page.drawText("admission register of the institution.", {
    x: 60, y, size: 14, font: timesRoman, color: COLORS.black,
  });

  y -= 70;
  const verifyText = "The above details are true and correct to the best of my knowledge.";
  page.drawText(verifyText, {
    x: (A4_WIDTH - timesRoman.widthOfTextAtSize(verifyText, 12)) / 2, y, size: 12, font: timesRoman, color: COLORS.black,
  });

  // Stamp placeholder (bottom-left)
  y -= 80;
  page.drawCircle({
    x: 110, y: y,
    size: 40,
    borderColor: COLORS.borderGray,
    borderWidth: 1,
    borderDashArray: [4, 4],
  });
  page.drawText("Stamp / Seal", {
    x: 82, y: y - 4, size: 9, font: helvetica, color: COLORS.gray,
  });

  // Signature placeholder (bottom-right)
  const principalText = "Principal";
  const headText = "Head of the Institution";
  page.drawText(principalText, {
    x: A4_WIDTH - timesBold.widthOfTextAtSize(principalText, 14) - 80,
    y: y + 20,
    size: 14,
    font: timesBold,
    color: COLORS.black,
  });
  page.drawText(headText, {
    x: 360,
    y,
    size: 11,
    font: timesRoman,
    color: COLORS.black,
  });
  if (data.instituteName) {
    page.drawText(data.instituteName, {
      x: 355, y: y - 14, size: 9, font: timesRoman, color: COLORS.gray,
    });
  }
  if (data.govRegNumber) {
    page.drawText(`${data.govRegNumber}`, {
      x: 395, y: y - 28, size: 9, font: timesRoman, color: COLORS.gray,
    });
  }

  // Block letters name line
  y -= 70;
  page.drawText(`(Name in Block letters : ${data.instituteName ? data.instituteName.split(" ").slice(-2).join(" ").toUpperCase() : "________________"})`, {
    x: 200, y, size: 10, font: timesRoman, color: COLORS.black,
  });

  // QR Code bottom-left
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  page.drawImage(qrImage, { x: 60, y: 45, width: 60, height: 60 });
  page.drawText("Scan to verify", { x: 62, y: 38, size: 7, font: helvetica, color: COLORS.lightGray });
}

// ============================================================================
// TEMPLATE TYPE C: School Address Study Certificate (Shivshankar Jolle style)
// ============================================================================
async function generateStudyTypeC(
  pdfDoc: PDFDocument,
  data: CertificateData,
  qrImageBytes: Uint8Array
) {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Outer border with double line for a premium look
  page.drawRectangle({
    x: 25, y: 25, width: A4_WIDTH - 50, height: A4_HEIGHT - 50,
    borderColor: COLORS.black, borderWidth: 3,
  });
  page.drawRectangle({
    x: 30, y: 30, width: A4_WIDTH - 60, height: A4_HEIGHT - 60,
    borderColor: COLORS.black, borderWidth: 0.5,
  });

  let y = A4_HEIGHT - 70;

  // Title
  const title = "STUDY CERTIFICATE";
  const titleWidth = timesBold.widthOfTextAtSize(title, 24);
  page.drawRectangle({
    x: (A4_WIDTH - titleWidth) / 2 - 20,
    y: y - 10,
    width: titleWidth + 40,
    height: 36,
    color: COLORS.black,
  });
  page.drawText(title, {
    x: (A4_WIDTH - titleWidth) / 2,
    y,
    size: 24,
    font: timesBold,
    color: rgb(1, 1, 1), // White text on black background
  });

  y -= 60;

  // School Name and Address block (Aligned cleanly like a Govt Doc)
  const lblName = "School Name / College :";
  page.drawText(lblName, { x: 60, y, size: 12, font: timesBold, color: COLORS.black });
  const lblNameW = timesBold.widthOfTextAtSize(lblName, 12);
  drawUnderlinedField(page, data.instituteName.toUpperCase(), 60 + lblNameW + 10, y, A4_WIDTH - (60 + lblNameW + 10) - 60, timesBold, 14);

  y -= 35;
  const lblAddr = "Full Address :";
  page.drawText(lblAddr, { x: 60, y, size: 12, font: timesBold, color: COLORS.black });
  const lblAddrW = timesBold.widthOfTextAtSize(lblAddr, 12);
  drawUnderlinedField(page, data.instituteAddress || "", 60 + lblAddrW + 10, y, A4_WIDTH - (60 + lblAddrW + 10) - 60, timesItalic, 12);

  y -= 35;
  const lblReg = "Registration No :";
  page.drawText(lblReg, { x: 60, y, size: 12, font: timesBold, color: COLORS.black });
  const lblRegW = timesBold.widthOfTextAtSize(lblReg, 12);
  drawUnderlinedField(page, data.govRegNumber || "", 60 + lblRegW + 10, y, 150, timesBold, 12);

  y -= 50;

  // Body - Professional Spacing
  const honorific = data.gender?.toLowerCase() === "female" ? "Kumari." : "Kumar.";
  const line1Text = `This is to certify that ${honorific}`;
  page.drawText(line1Text, { x: 60, y, size: 14, font: timesRoman, color: COLORS.black });
  const l1W = timesRoman.widthOfTextAtSize(line1Text, 14);
  drawUnderlinedField(page, data.studentName.toUpperCase(), 60 + l1W + 10, y, A4_WIDTH - (60 + l1W + 10) - 60, timesBold, 15);

  y -= 45;
  const relText = data.gender?.toLowerCase() === "female" ? "D/o." : "S/o.";
  page.drawText(relText, { x: 60, y, size: 14, font: timesRoman, color: COLORS.black });
  const relW = timesRoman.widthOfTextAtSize(relText, 14);
  drawUnderlinedField(page, data.fatherName.toUpperCase(), 60 + relW + 10, y, 320, timesBold, 15);
  
  const hasText = "has";
  page.drawText(hasText, { x: A4_WIDTH - timesRoman.widthOfTextAtSize(hasText, 14) - 60, y, size: 14, font: timesRoman, color: COLORS.black });

  y -= 45;
  page.drawText("studied from", { x: 60, y, size: 14, font: timesRoman, color: COLORS.black });
  const studW = timesRoman.widthOfTextAtSize("studied from", 14);
  drawUnderlinedField(page, data.studiedFromClass, 60 + studW + 10, y, 100, timesBold, 15);
  
  page.drawText("Standard to", { x: 60 + studW + 10 + 100 + 10, y, size: 14, font: timesRoman, color: COLORS.black });
  const stdToW = timesRoman.widthOfTextAtSize("Standard to", 14);
  drawUnderlinedField(page, data.studiedToClass, 60 + studW + 10 + 100 + 10 + stdToW + 10, y, 100, timesBold, 15);
  
  const stdOur = "standard in our";
  page.drawText(stdOur, { x: A4_WIDTH - timesRoman.widthOfTextAtSize(stdOur, 14) - 60, y, size: 14, font: timesRoman, color: COLORS.black });

  y -= 45;
  page.drawText("institution from", { x: 60, y, size: 14, font: timesRoman, color: COLORS.black });
  const instFromW = timesRoman.widthOfTextAtSize("institution from", 14);
  drawUnderlinedField(page, data.academicYearFrom, 60 + instFromW + 10, y, 100, timesBold, 15);
  
  page.drawText("to", { x: 60 + instFromW + 10 + 100 + 10, y, size: 14, font: timesRoman, color: COLORS.black });
  drawUnderlinedField(page, data.academicYearTo, 60 + instFromW + 10 + 100 + 10 + 20, y, 100, timesBold, 15);
  
  const acadPer = "academic year as per";
  page.drawText(acadPer, { x: A4_WIDTH - timesRoman.widthOfTextAtSize(acadPer, 14) - 60, y, size: 14, font: timesRoman, color: COLORS.black });

  y -= 40;
  page.drawText("the institution records.", { x: 60, y, size: 14, font: timesRoman, color: COLORS.black });

  y -= 60;
  const verify = "The above details are true and correct to the best of my knowledge.";
  page.drawText(verify, {
    x: (A4_WIDTH - timesRoman.widthOfTextAtSize(verify, 12)) / 2,
    y, size: 12, font: timesRoman, color: COLORS.black,
  });

  // Stamp placeholder
  y -= 100;
  page.drawCircle({
    x: 110, y: y, size: 40,
    borderColor: COLORS.borderGray,
    borderWidth: 1, borderDashArray: [4, 4],
  });
  page.drawText("Stamp / Seal", {
    x: 82, y: y - 5, size: 9, font: helvetica, color: COLORS.gray,
  });

  // Signature
  page.drawText("Signature of Principal", {
    x: A4_WIDTH - timesBold.widthOfTextAtSize("Signature of Principal", 14) - 60, y, size: 14, font: timesBold, color: COLORS.black,
  });

  // Place / Date
  y -= 50;
  page.drawText(`Place: _________________`, { x: 60, y, size: 12, font: timesBold, color: COLORS.black });
  page.drawText(`Date: ${data.issueDate}`, { x: 60, y: y - 25, size: 12, font: timesBold, color: COLORS.black });

  // Counter-signed Section
  y -= 65;
  page.drawLine({
    start: { x: 40, y: y + 10 }, end: { x: A4_WIDTH - 40, y: y + 10 },
    thickness: 1, color: COLORS.black,
  });
  
  const csText = "COUNTERSIGNED BY BLOCK EDUCATION OFFICER (BEO)";
  page.drawText(csText, {
    x: (A4_WIDTH - timesBold.widthOfTextAtSize(csText, 12)) / 2,
    y: y - 10, size: 12, font: timesBold, color: COLORS.black,
  });

  // QR Code bottom-left
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  page.drawImage(qrImage, { x: A4_WIDTH - 120, y: 40, width: 60, height: 60 });
  page.drawText("Scan to verify", { x: A4_WIDTH - 118, y: 30, size: 8, font: helvetica, color: COLORS.gray });
}

// ============================================================================
// TEMPLATE TYPE KANNADA: ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ
// Uses embedded Noto Sans Kannada font for real Unicode rendering
// ============================================================================
async function generateStudyKannada(
  pdfDoc: PDFDocument,
  data: CertificateData,
  qrImageBytes: Uint8Array
) {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Embed Noto Sans Kannada for real ಕನ್ನಡ text
  const fontPath = path.join(process.cwd(), "src", "fonts", "NotoSansKannada.ttf");
  const fontBytes = fs.readFileSync(fontPath);
  const kannadaFont = await pdfDoc.embedFont(fontBytes, { subset: true });

  drawBorder(page, A4_WIDTH, A4_HEIGHT);

  let y = A4_HEIGHT - 90;

  // Title: ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ
  const title = "\u0CB6\u0CBE\u0CB2\u0CBE \u0CA6\u0CBE\u0C96\u0CB2\u0CBE\u0CA4\u0CBF \u0CAA\u0CCD\u0CB0\u0CAE\u0CBE\u0CA3 \u0CAA\u0CA4\u0CCD\u0CB0";
  const titleW = kannadaFont.widthOfTextAtSize(title, 26);
  page.drawText(title, {
    x: (A4_WIDTH - titleW) / 2, y, size: 26, font: kannadaFont, color: COLORS.black,
  });

  y -= 55;

  // ಕುಮಾರ/ಕುಮಾರಿ
  page.drawText("\u0C95\u0CC1\u0CAE\u0CBE\u0CB0/\u0C95\u0CC1\u0CAE\u0CBE\u0CB0\u0CBF..........", { x: 60, y, size: 13, font: kannadaFont, color: COLORS.black });
  page.drawText(data.studentName, { x: 240, y, size: 14, font: kannadaFont, color: COLORS.black });
  page.drawLine({ start: { x: 235, y: y - 3 }, end: { x: 520, y: y - 3 }, thickness: 0.5, color: COLORS.black });

  y -= 35;

  // ಸಾಟ್ಸ್ ಸಂಖ್ಯೆ (SATS Number) — use English for the number
  page.drawText("\u0CB8\u0CBE\u0C9F\u0CCD\u0CB8\u0CCD \u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6..........", { x: 60, y, size: 13, font: kannadaFont, color: COLORS.black });
  page.drawLine({ start: { x: 235, y: y - 3 }, end: { x: 520, y: y - 3 }, thickness: 0.5, color: COLORS.black });

  y -= 35;

  // ಇವರು (Father name) ರಿಂದ
  page.drawText("\u0C87\u0CB5\u0CB0\u0CC1..........", { x: 60, y, size: 13, font: kannadaFont, color: COLORS.black });
  page.drawText(data.fatherName, { x: 175, y, size: 14, font: kannadaFont, color: COLORS.black });
  page.drawLine({ start: { x: 170, y: y - 3 }, end: { x: 375, y: y - 3 }, thickness: 0.5, color: COLORS.black });
  page.drawText("\u0CB0\u0CBF\u0C82\u0CA6", { x: 385, y, size: 13, font: kannadaFont, color: COLORS.black });

  y -= 40;

  // Long template line in Kannada
  page.drawText("\u0CA8\u0CC7 \u0C87\u0CAF\u0CA4\u0CCD\u0CA4\u0CC6\u0CAF \u0CB5\u0CB0\u0CC6\u0C97\u0CC6 \u0CA8\u0CAE\u0CCD\u0CAE \u0CB6\u0CBE\u0CB2\u0CC6\u0CAF\u0CB2\u0CCD\u0CB2\u0CBF \u0C95\u0CB2\u0CBF\u0CA4\u0CB5/\u0C95\u0CB2\u0CBF\u0CAF\u0CC1\u0CA4\u0CCD\u0CA4\u0CBF\u0CA6\u0CCD\u0CA6\u0CC1 \u0CA8\u0CAE\u0CCD\u0CAE \u0CB6\u0CBE\u0CB2\u0CC6\u0CAF", {
    x: 60, y, size: 11, font: kannadaFont, color: COLORS.black,
  });

  y -= 30;
  page.drawText("1\u0CA8\u0CC7 \u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6 \u0CB0\u0C9C\u0CBF\u0CB8\u0CCD\u0C9F\u0CB0\u0CA6.......", { x: 60, y, size: 12, font: kannadaFont, color: COLORS.black });

  y -= 35;

  // Caste and place of birth
  page.drawText("..............\u0CAA\u0CCD\u0CB0\u0C95\u0CBE\u0CB0 \u0C87\u0CB5\u0CB0 \u0C9C\u0CBE\u0CA4\u0CBF", { x: 60, y, size: 12, font: kannadaFont, color: COLORS.black });
  page.drawText(data.caste || "", { x: 310, y, size: 13, font: kannadaFont, color: COLORS.black });
  page.drawLine({ start: { x: 305, y: y - 3 }, end: { x: 395, y: y - 3 }, thickness: 0.5, color: COLORS.black });
  page.drawText("\u0C9C\u0CA8\u0CCD\u0CAE \u0CB8\u0CCD\u0CA5\u0CB3", { x: 410, y, size: 12, font: kannadaFont, color: COLORS.black });

  y -= 40;

  // Date of birth
  page.drawText("\u0C87\u0CA6\u0CC6 \u0CAE\u0CA4\u0CCD\u0CA4\u0CC1 \u0C87\u0CB5\u0CB0 \u0C9C\u0CA8\u0CCD\u0CAE \u0CA6\u0CBF\u0CA8\u0CBE\u0C82\u0C95\u0CB5\u0CC1 ...................", { x: 60, y, size: 12, font: kannadaFont, color: COLORS.black });
  page.drawText(data.dob || "", { x: 370, y, size: 13, font: timesRoman, color: COLORS.black });

  y -= 30;
  page.drawText("(\u0C85\u0C95\u0CCD\u0CB7\u0CB0\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF.............", { x: 60, y, size: 12, font: kannadaFont, color: COLORS.black });

  y -= 35;
  page.drawText(") \u0C87\u0CB0\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6. \u0C8E\u0C82\u0CA6\u0CC1 \u0CAA\u0CCD\u0CB0\u0CAE\u0CBE\u0CA3 \u0CAA\u0CA4\u0CCD\u0CB0 \u0CA8\u0CC0\u0CA1\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6.", { x: 180, y, size: 13, font: kannadaFont, color: COLORS.black });

  y -= 70;

  // Place / Date / Signature
  page.drawText("\u0CB8\u0CCD\u0CA5\u0CB3 :", { x: 60, y, size: 14, font: kannadaFont, color: COLORS.black });
  y -= 28;
  page.drawText("\u0CA6\u0CBF\u0CA8\u0CBE\u0C82\u0C95 :", { x: 60, y, size: 14, font: kannadaFont, color: COLORS.black });
  page.drawText(data.issueDate, { x: 135, y, size: 12, font: timesRoman, color: COLORS.black });
  page.drawText("\u0CAE\u0CC1\u0C96\u0CCD\u0CAF\u0CCB\u0CAA\u0CBE\u0CA7\u0CCD\u0CAF\u0CBE\u0CAF\u0CB0\u0CC1", { x: 380, y, size: 15, font: kannadaFont, color: COLORS.black });

  // Stamp placeholder
  y -= 55;
  page.drawCircle({
    x: 430, y, size: 38,
    borderColor: COLORS.borderGray, borderWidth: 0.5, borderDashArray: [3, 3],
  });
  page.drawText("Stamp / Seal", { x: 405, y: y - 5, size: 9, font: helvetica, color: COLORS.lightGray });

  // QR Code
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  page.drawImage(qrImage, { x: 60, y: 45, width: 60, height: 60 });
  page.drawText("Scan to verify", { x: 62, y: 38, size: 7, font: helvetica, color: COLORS.lightGray });
}


// ============================================================================
// MAIN EXPORT: Generate a complete certificate PDF
// ============================================================================
export async function generateCertificatePDF(
  data: CertificateData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Register fontkit for custom font embedding (Kannada)
  pdfDoc.registerFontkit(fontkit);

  // Info metadata
  pdfDoc.setTitle(`${data.certificateType} - ${data.studentName}`);
  pdfDoc.setSubject("Study Certificate");
  pdfDoc.setProducer("QuickCert SaaS Platform");
  pdfDoc.setCreator("QuickCert by IAST");

  // Generate QR code
  const verifyUrl = `${data.qrVerifyBaseUrl}/verify/${data.qrValidationKey}`;
  const qrImageBytes = await generateQRCode(verifyUrl);

  // Route to the correct template
  if (data.certificateType.startsWith("CUSTOM_")) {
    await generateCustomTemplate(pdfDoc, data, qrImageBytes);
  } else {
    switch (data.certificateType) {
    case "STUDY_A":
      await generateStudyTypeA(pdfDoc, data, qrImageBytes);
      break;
    case "STUDY_B":
      await generateStudyTypeB(pdfDoc, data, qrImageBytes);
      break;
    case "STUDY_C":
      await generateStudyTypeC(pdfDoc, data, qrImageBytes);
      break;
    case "STUDY_KANNADA":
      await generateStudyKannada(pdfDoc, data, qrImageBytes);
      break;
      default:
        await generateStudyTypeA(pdfDoc, data, qrImageBytes);
    }
  }

  return await pdfDoc.save();
}
