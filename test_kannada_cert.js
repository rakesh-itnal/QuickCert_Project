// Test script: Generate a real Kannada certificate with embedded Noto Sans Kannada font
require("regenerator-runtime/runtime");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

async function generateQR(url) {
  const dataUrl = await QRCode.toDataURL(url, { width: 100, margin: 1 });
  const base64 = dataUrl.split(",")[1];
  return Buffer.from(base64, "base64");
}

async function main() {
  console.log("=== Generating Kannada Certificate with Real ಕನ್ನಡ Font ===\n");

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  pdfDoc.setTitle("ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ");
  pdfDoc.setProducer("QuickCert SaaS Platform");

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  // Load Noto Sans Kannada font
  const fontPath = path.join(__dirname, "src", "fonts", "NotoSansKannada.ttf");
  console.log("Loading font from:", fontPath);
  const fontBytes = fs.readFileSync(fontPath);
  console.log("Font size:", (fontBytes.length / 1024).toFixed(1), "KB");
  
  const kannadaFont = await pdfDoc.embedFont(fontBytes, { subset: true });
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.6, 0.6, 0.6);
  const borderGray = rgb(0.75, 0.75, 0.75);

  // Double border
  page.drawRectangle({ x: 30, y: 30, width: A4_WIDTH - 60, height: A4_HEIGHT - 60, borderColor: borderGray, borderWidth: 2 });
  page.drawRectangle({ x: 36, y: 36, width: A4_WIDTH - 72, height: A4_HEIGHT - 72, borderColor: borderGray, borderWidth: 0.5 });

  const cx = A4_WIDTH / 2;
  let y = A4_HEIGHT - 90;

  // =========================================================================
  // TITLE: ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ
  // =========================================================================
  const title = "ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ";
  const titleW = kannadaFont.widthOfTextAtSize(title, 26);
  page.drawText(title, {
    x: (A4_WIDTH - titleW) / 2, y,
    size: 26, font: kannadaFont, color: black,
  });

  y -= 55;

  // =========================================================================
  // BODY — Full Kannada content matching the real certificate template
  // =========================================================================

  // Line 1: ಕುಮಾರ/ಕುಮಾರಿ........
  page.drawText("ಕುಮಾರ/ಕುಮಾರಿ..........", { x: 60, y, size: 13, font: kannadaFont, color: black });
  // Student name
  page.drawText("ರಾಕೇಶ ಶಿದಾರಯ ಇಟ್ನಾಳ", { x: 240, y, size: 14, font: kannadaFont, color: black });
  page.drawLine({ start: { x: 235, y: y - 3 }, end: { x: 520, y: y - 3 }, thickness: 0.5, color: black });

  y -= 35;

  // Line 2: ಸಾಟ್ಸ್ ಸಂಖ್ಯೆ
  page.drawText("ಸಾಟ್ಸ್ ಸಂಖ್ಯೆ..........", { x: 60, y, size: 13, font: kannadaFont, color: black });
  page.drawText("STS2024001", { x: 240, y, size: 12, font: timesRoman, color: black });
  page.drawLine({ start: { x: 235, y: y - 3 }, end: { x: 520, y: y - 3 }, thickness: 0.5, color: black });

  y -= 35;

  // Line 3: ಇವರು ________ ರಿಂದ
  page.drawText("ಇವರು..........", { x: 60, y, size: 13, font: kannadaFont, color: black });
  page.drawText("ಶಿದಾರಯ ಇಟ್ನಾಳ", { x: 175, y, size: 14, font: kannadaFont, color: black });
  page.drawLine({ start: { x: 170, y: y - 3 }, end: { x: 375, y: y - 3 }, thickness: 0.5, color: black });
  page.drawText("ರಿಂದ", { x: 385, y, size: 13, font: kannadaFont, color: black });

  y -= 40;

  // Line 4: ನೇ ಇಯತ್ತೆಯ ವರೆಗೆ ನಮ್ಮ ಶಾಲೆಯಲ್ಲಿ ಕಲಿತವ/ಕಲಿಯುತ್ತಿದ್ದು ನಮ್ಮ ಶಾಲೆಯ 1ನೇ ಸಂಖ್ಯೆ ರಜಿಸ್ಟರದ
  page.drawText("ನೇ ಇಯತ್ತೆಯ ವರೆಗೆ ನಮ್ಮ ಶಾಲೆಯಲ್ಲಿ ಕಲಿತವ/ಕಲಿಯುತ್ತಿದ್ದು ನಮ್ಮ ಶಾಲೆಯ 1ನೇ ಸಂಖ್ಯೆ ರಜಿಸ್ಟರದ", { 
    x: 60, y, size: 11, font: kannadaFont, color: black 
  });

  y -= 35;

  // Line 5: ..........ಪ್ರಕಾರ ಇವರ ಜಾತಿ __________ ಜನ್ಮ ಸ್ಥಳ __________
  page.drawText("..............ಪ್ರಕಾರ ಇವರ ಜಾತಿ", { x: 60, y, size: 12, font: kannadaFont, color: black });
  page.drawText("ಲಿಂಗಾಯತ", { x: 260, y, size: 13, font: kannadaFont, color: black });
  page.drawLine({ start: { x: 255, y: y - 3 }, end: { x: 345, y: y - 3 }, thickness: 0.5, color: black });
  page.drawText("ಜನ್ಮ ಸ್ಥಳ", { x: 360, y, size: 12, font: kannadaFont, color: black });
  page.drawText("ಹಂದಿಗುಂದ", { x: 430, y, size: 13, font: kannadaFont, color: black });
  page.drawLine({ start: { x: 425, y: y - 3 }, end: { x: 530, y: y - 3 }, thickness: 0.5, color: black });

  y -= 40;

  // Line 6: ಇದೆ ಮತ್ತು ಇವರ ಜನ್ಮ ದಿನಾಂಕವು _________
  page.drawText("ಇದೆ ಮತ್ತು ಇವರ ಜನ್ಮ ದಿನಾಂಕವು ...................", { x: 60, y, size: 12, font: kannadaFont, color: black });
  page.drawText("22/06/2004", { x: 370, y, size: 13, font: timesRoman, color: black });

  y -= 30;

  // Line 7: (ಅಕ್ಷರದಲ್ಲಿ
  page.drawText("(ಅಕ್ಷರದಲ್ಲಿ.............", { x: 60, y, size: 12, font: kannadaFont, color: black });
  page.drawText("ಇಪ್ಪತ್ತೆರಡನೇ ಜೂನ್ ಎರಡು ಸಾವಿರದ ನಾಲ್ಕು", { x: 190, y, size: 11, font: kannadaFont, color: black });

  y -= 35;

  // Line 8: ) ಇರುತ್ತದೆ. ಎಂದು ಪ್ರಮಾಣ ಪತ್ರ ನೀಡಲಾಗಿದೆ.
  page.drawText(") ಇರುತ್ತದೆ. ಎಂದು ಪ್ರಮಾಣ ಪತ್ರ ನೀಡಲಾಗಿದೆ.", { x: 180, y, size: 13, font: kannadaFont, color: black });

  y -= 70;

  // =========================================================================
  // FOOTER
  // =========================================================================

  // ಸ್ಥಳ : (Place)
  page.drawText("ಸ್ಥಳ :", { x: 60, y, size: 14, font: kannadaFont, color: black });

  y -= 28;

  // ದಿನಾಂಕ : (Date)
  page.drawText("ದಿನಾಂಕ :", { x: 60, y, size: 14, font: kannadaFont, color: black });
  page.drawText("27/03/2026", { x: 135, y, size: 12, font: timesRoman, color: black });

  // ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು (Principal / Headmaster) on the right
  page.drawText("ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು", { x: 380, y, size: 15, font: kannadaFont, color: black });

  // Stamp placeholder
  y -= 55;
  page.drawCircle({
    x: 430, y, size: 38,
    borderColor: borderGray, borderWidth: 0.5, borderDashArray: [3, 3],
  });
  page.drawText("ಮುದ್ರೆ / Seal", { x: 405, y: y - 5, size: 9, font: kannadaFont, color: lightGray });

  // Institute name at bottom center
  y -= 55;
  const instText = "ಚಿರಿಬಿರಿ ಮುಸ್ತಕಾಲಯ, ಮುಧೋಳ – 9845897577";
  const instW = kannadaFont.widthOfTextAtSize(instText, 10);
  page.drawText(instText, {
    x: (A4_WIDTH - instW) / 2, y, size: 10, font: kannadaFont, color: gray,
  });

  // QR Code bottom-left
  const qrBytes = await generateQR("http://localhost:3000/verify/kannada-test-key");
  const qrImage = await pdfDoc.embedPng(qrBytes);
  page.drawImage(qrImage, { x: 60, y: 45, width: 60, height: 60 });
  page.drawText("ಪರಿಶೀಲಿಸಿ (Verify)", { x: 58, y: 37, size: 7, font: kannadaFont, color: lightGray });

  // Save
  const pdfBytes = await pdfDoc.save();
  const outDir = path.join(__dirname, "test_certificates");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, "Rakesh_Itnal_KANNADA_REAL.pdf");
  fs.writeFileSync(outPath, pdfBytes);
  console.log(`\n✓ Kannada certificate generated: ${outPath}`);
  console.log(`  File size: ${(pdfBytes.length / 1024).toFixed(1)} KB`);
  console.log("\nAll ಕನ್ನಡ Unicode text rendered with Noto Sans Kannada font!");
}

main().catch(e => { console.error("ERROR:", e); process.exit(1); });
