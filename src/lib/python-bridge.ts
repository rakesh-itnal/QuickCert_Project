import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runPythonIntelligentFiller(
  pdfInputPath: string,
  jsonData: Record<string, any>
): Promise<Buffer> {
  const rootDir = process.cwd();
  const pythonDir = path.join(rootDir, "intelligent_certificate_filler");
  
  // Ensure temp dir exists
  const tempDir = path.join(pythonDir, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = Date.now();
  const jsonPath = path.join(tempDir, `data_${timestamp}.json`);
  const outputPath = path.join(tempDir, `output_${timestamp}.png`);
  const outputPdfPath = path.join(tempDir, `output_${timestamp}.pdf`);

  // Write JSON locally for python to read
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

  // Platform specific python path within the venv
  const isWin = process.platform === "win32";
  const pythonExec = isWin 
    ? path.join(pythonDir, "venv", "Scripts", "python.exe")
    : path.join(pythonDir, "venv", "bin", "python");

  if (!fs.existsSync(pythonExec)) {
    throw new Error(`Python virtual environment not found at ${pythonExec}. Please run setup commands.`);
  }

  // Construct command with absolute paths
  const mainScript = path.join(pythonDir, "main.py");
  const command = `"${pythonExec}" "${mainScript}" --input "${pdfInputPath}" --data "${jsonPath}" --output "${outputPath}"`;

  try {
    // Run the Python script (it might take 15-30 seconds due to CPU OCR)
    // We increase maxBuffer just in case print statements get huge
    const { stdout, stderr } = await execAsync(command, { 
        cwd: pythonDir,
        maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    console.log("Python Backend executed successfully:\n", stdout);

    if (!fs.existsSync(outputPdfPath)) {
        throw new Error("Python script finished without generating the target PDF. Log: " + stderr);
    }

    // Read resulting PDF as Buffer
    const pdfBuffer = fs.readFileSync(outputPdfPath);
    return pdfBuffer;
  } catch (error: any) {
    console.error("Error executing Python backend:", error);
    throw new Error(`AI Engine failed: ${error.message}`);
  } finally {
    // Cleanup temporary files synchronously so they don't block
    try {
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (fs.existsSync(outputPdfPath)) fs.unlinkSync(outputPdfPath);
    } catch (e) {
      console.warn("Failed to cleanup python bridge temp files:", e);
    }
  }
}
