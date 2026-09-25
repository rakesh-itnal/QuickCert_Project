// Kannada Certificate Generator — Uses embedded Noto Sans Kannada font
// This is a standalone module for the Kannada template

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const COLORS = {
  black: rgb(0, 0, 0),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.6, 0.6, 0.6),
  borderGray: rgb(0.75, 0.75, 0.75),
};

export interface KannadaCertData {
  studentName: string;
  fatherName: string;
  satsNumber?: string;
  dob?: string;
  dobWords?: string;
  caste?: string;
  placeOfBirth?: string;
  classFrom?: string;
  classTo?: string;
  regNumber?: string;
  instituteName: string;
  instituteAddress?: string;
  issueDate: string;
  qrImageBytes: Uint8Array;
}

export async function generateKannadaCertificate(data: KannadaCertData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ - ${data.studentName}`);
  pdfDoc.setProducer("QuickCert SaaS Platform");

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  // Load Noto Sans Kannada font
  const fontPath = path.join(process.cwd(), "src", "fonts", "NotoSansKannada.ttf");
  const fontBytes = fs.readFileSync(fontPath);
  const kannadaFont = await pdfDoc.embedFont(fontBytes, { subset: true });
  
  // Also load standard English fonts for mixed content
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Double border
  page.drawRectangle({ x: 30, y: 30, width: A4_WIDTH - 60, height: A4_HEIGHT - 60, borderColor: COLORS.borderGray, borderWidth: 2 });
  page.drawRectangle({ x: 36, y: 36, width: A4_WIDTH - 72, height: A4_HEIGHT - 72, borderColor: COLORS.borderGray, borderWidth: 0.5 });

  const cx = A4_WIDTH / 2;
  let y = A4_HEIGHT - 90;

  // =========================================================================
  // TITLE: ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ
  // =========================================================================
  const title = "ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ";
  const titleW = kannadaFont.widthOfTextAtSize(title, 24);
  page.drawText(title, {
    x: (A4_WIDTH - titleW) / 2, y,
    size: 24, font: kannadaFont, color: COLORS.black,
  });

  y -= 50;

  // =========================================================================
  // BODY in Kannada
  // =========================================================================

  // ಕುಮಾರ/ಕುಮಾರಿ (Kumar/Kumari): _________________
  const line1Label = "ಕುಮಾರ/ಕುಮಾರಿ.......";
  page.drawText(line1Label, { x: 60, y, size: 14, font: kannadaFont, color: COLORS.black });
  // Student name in bold
  page.drawText(data.studentName, { x: 230, y, size: 14, font: kannadaFont, color: COLORS.black });
  page.drawLine({ start: { x: 225, y: y - 3 }, end: { x: 520, y: y - 3 }, thickness: 0.5, color: COLORS.black });

  y -= 35;

  // ಸಾಟ್ಸ್ ಸಂಖ್ಯೆ (SATS Number)
  const line2Label = "ಸಾಟ್ಸ್ ಸಂಖ್ಯೆ.......";
  page.drawText(line2Label, { x: 60, y, size: 14, font: kannadaFont, color: COLORS.black });
  page.drawText(data.satsNumber || "", { x: 225, y, size: 13, font: timesRoman, color: COLORS.black });
  page.drawLine({ start: { x: 220, y: y - 3 }, end: { x: 520, y: y - 3 }, thickness: 0.5, color: COLORS.black });

  y -= 35;

  // ಇವರು (Their father's name) __________ ರಿಂದ
  const line3Label = "ಇವರು.......";
  page.drawText(line3Label, { x: 60, y, size: 14, font: kannadaFont, color: COLORS.black });
  page.drawText(data.fatherName, { x: 150, y, size: 14, font: kannadaFont, color: COLORS.black });
  page.drawLine({ start: { x: 145, y: y - 3 }, end: { x: 380, y: y - 3 }, thickness: 0.5, color: COLORS.black });
  page.drawText("ರಿಂದ", { x: 390, y, size: 14, font: kannadaFont, color: COLORS.black });

  y -= 40;

  // ನೇ ಇಯತ್ತೆಯ ವರೆಗೆ ನಮ್ಮ ಶಾಲೆಯಲ್ಲಿ ಕಲಿತವ/ಕಲಿಯುತ್ತಿದ್ದು ನಮ್ಮ ಶಾಲೆಯ ಸಂಖ್ಯೆ ರಜಿಸ್ಟರದ 
  const longLine = "ನೇ ಇಯತ್ತೆಯ ವರೆಗೆ ನಮ್ಮ ಶಾಲೆಯಲ್ಲಿ ಕಲಿತವ/ಕಲಿಯುತ್ತಿದ್ದು ನಮ್ಮ ಶಾಲೆಯ";
  page.drawText(data.classFrom || "___", { x: 60, y, size: 14, font: kannadaFont, color: COLORS.black });
  page.drawText(longLine, { x: 100, y, size: 12, font: kannadaFont, color: COLORS.black });

  y -= 30;
  const regLine = "1ನೇ ಸಂಖ್ಯೆ ರಜಿಸ್ಟರದ.......";
  page.drawText(regLine, { x: 60, y, size: 12, font: kannadaFont, color: COLORS.black });

  y -= 35;

  // ............ಪ್ರಕಾರ ಇವರ ಜಾತಿ ............ಜನ್ಮ ಸ್ಥಳ
  page.drawText("..............ಪ್ರಕಾರ ಇವರ ಜಾತಿ...........", { x: 60, y, size: 12, font: kannadaFont, color: COLORS.black });
  page.drawText(data.caste || "", { x: 310, y, size: 13, font: kannadaFont, color: COLORS.black });
  page.drawText("ಜನ್ಮ ಸ್ಥಳ", { x: 410, y, size: 12, font: kannadaFont, color: COLORS.black });
  page.drawText(data.placeOfBirth || "", { x: 475, y, size: 11, font: kannadaFont, color: COLORS.black });

  y -= 40;

  // ಇದೆ ಮತ್ತು ಇವರ ಜನ್ಮ ದಿನಾಂಕವು ..................
  page.drawText("ಇದೆ ಮತ್ತು ಇವರ ಜನ್ಮ ದಿನಾಂಕವು ..................", { x: 60, y, size: 12, font: kannadaFont, color: COLORS.black });
  page.drawText(data.dob || "", { x: 360, y, size: 13, font: kannadaFont, color: COLORS.black });

  y -= 30;

  // (ಅಕ್ಷರದಲ್ಲಿ) — DOB in words
  page.drawText("(ಅಕ್ಷರದಲ್ಲಿ...........", { x: 60, y, size: 12, font: kannadaFont, color: COLORS.black });

  y -= 35;

  // ) ಇರುತ್ತದೆ. ಎಂದು ಪ್ರಮಾಣ ಪತ್ರ ನೀಡಲಾಗಿದೆ.
  page.drawText(") ಇರುತ್ತದೆ. ಎಂದು ಪ್ರಮಾಣ ಪತ್ರ ನೀಡಲಾಗಿದೆ.", { x: 180, y, size: 12, font: kannadaFont, color: COLORS.black });

  y -= 60;

  // ಸ್ಥಳ : (Place)
  page.drawText("ಸ್ಥಳ :", { x: 60, y, size: 13, font: kannadaFont, color: COLORS.black });

  y -= 25;

  // ದಿನಾಂಕ : (Date)
  page.drawText("ದಿನಾಂಕ :", { x: 60, y, size: 13, font: kannadaFont, color: COLORS.black });
  page.drawText(data.issueDate, { x: 130, y, size: 12, font: timesRoman, color: COLORS.black });

  // ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು (Principal / Headmaster)
  page.drawText("ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು", { x: 380, y, size: 14, font: kannadaFont, color: COLORS.black });

  // Stamp / Seal placeholder
  y -= 60;
  page.drawCircle({
    x: 430, y, size: 38,
    borderColor: COLORS.borderGray, borderWidth: 0.5, borderDashArray: [3, 3],
  });
  page.drawText("ಮುದ್ರೆ", { x: 415, y: y - 3, size: 10, font: kannadaFont, color: COLORS.lightGray });

  // Institute name at bottom
  y -= 50;
  const instLine = data.instituteName;
  const instW = kannadaFont.widthOfTextAtSize(instLine, 11);
  page.drawText(instLine, {
    x: (A4_WIDTH - instW) / 2, y, size: 11, font: kannadaFont, color: COLORS.gray,
  });

  // QR Code bottom-left
  const qrImage = await pdfDoc.embedPng(data.qrImageBytes);
  page.drawImage(qrImage, { x: 60, y: 45, width: 60, height: 60 });
  page.drawText("ಪರಿಶೀಲಿಸಿ", { x: 68, y: 37, size: 8, font: kannadaFont, color: COLORS.lightGray });

  return await pdfDoc.save();
}
