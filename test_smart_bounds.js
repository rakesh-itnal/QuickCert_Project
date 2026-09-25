import { PDFDocument, StandardFonts } from "pdf-lib";

async function runTextScaleTest() {
  const pdfDoc = await PDFDocument.create();
  const times = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  function getScaledFontSizeAndWidth(text, baseSize, maxWidth, font) {
    let currentSize = baseSize;
    let textWidth = font.widthOfTextAtSize(text, currentSize);
    
    while (textWidth > maxWidth && currentSize > 4) {
      currentSize -= 0.5;
      textWidth = font.widthOfTextAtSize(text, currentSize);
    }
    return { size: currentSize, textWidth };
  }

  const shortName = "RAKESH KUMAR";
  const longName = "VENKATA RAMANA GOVINDA SHANKAR NARAYANA";
  const maxWidth = 100; // Small bounded area
  
  const shortResult = getScaledFontSizeAndWidth(shortName, 16, maxWidth, times);
  console.log(`Short Name Width at 16pt: ${times.widthOfTextAtSize(shortName, 16)}`);
  console.log(`Short Name Scaled: ${shortResult.size}pt, Width: ${shortResult.textWidth}`);
  
  const longResult = getScaledFontSizeAndWidth(longName, 16, maxWidth, times);
  console.log(`Long Name Width at 16pt: ${times.widthOfTextAtSize(longName, 16)}`);
  console.log(`Long Name Scaled: ${longResult.size}pt, Width: ${longResult.textWidth}`);

  if (longResult.textWidth <= maxWidth) {
    console.log("SUCCESS: Long name perfectly scaled down to fit within bounds!");
  } else {
    console.error("FAILED: Did not scale down correctly.");
  }
}

runTextScaleTest().catch(console.error);
