"use client"

import { UploadCloud, Download, CheckCircle, Loader2, AlertCircle, Info, RotateCcw } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { importStudents, deleteStudentsBySTAS } from "@/app/actions/student-actions";
import { useRouter } from "next/navigation";

interface DetectedMetadata {
  year?: string;
  class?: string;
  stream?: string;
  batch?: string;
  section?: string;
}

export default function ExcelUploader() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "metadata-detection">("idle");
  const [message, setMessage] = useState("");
  const [targetClass, setTargetClass] = useState("1st PUC");
  const [detectedMetadata, setDetectedMetadata] = useState<DetectedMetadata | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importedSATS, setImportedSATS] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderMetadataDetection = (file: File, rawMatrix: any[][]) => {
    // Extract metadata from pre-header rows
    const extractMetadata = (preHeaderRows: string[]): DetectedMetadata => {
      const metadata: DetectedMetadata = {};
      const combinedText = preHeaderRows.join(" ").toLowerCase();

      // Year/Class Detection
      if (/\b(1st|first|i)\s*(puc|year)/i.test(combinedText)) {
        metadata.year = "1st";
        metadata.class = "1st PUC";
      } else if (/\b(2nd|second|ii)\s*(puc|year)/i.test(combinedText)) {
        metadata.year = "2nd";
        metadata.class = "2nd PUC";
      } else if (/\b(3rd|third|iii)\s*(puc|year)/i.test(combinedText)) {
        metadata.year = "3rd";
        metadata.class = "3rd PUC";
      }

      // Stream Detection
      if (/\b(science|pcm|pcb)\b/i.test(combinedText)) metadata.stream = "Science";
      else if (/\b(commerce|ca)\b/i.test(combinedText)) metadata.stream = "Commerce";
      else if (/\b(arts|humanities)\b/i.test(combinedText)) metadata.stream = "Arts";

      return metadata;
    };

    // Find header row index
    let headerRowIndex = 0;
    const isHeaderColumn = (str: string) => ["sats", "name", "dob", "mother"].some(k => String(str).toLowerCase().includes(k));
    for (let i = 0; i < Math.min(20, rawMatrix.length); i++) {
      const row = rawMatrix[i] || [];
      const headerMatches = row.filter((cell: any) => isHeaderColumn(String(cell))).length;
      if (headerMatches >= 2) {
        headerRowIndex = i;
        break;
      }
    }

    const preHeaderRows = rawMatrix.slice(0, headerRowIndex).map((row: any[]) => row.join(" "));
    const metadata = extractMetadata(preHeaderRows);

    if (metadata.year || metadata.stream) {
      setDetectedMetadata(metadata);
      setPendingFile(file);
      setStatus("metadata-detection");
      setMessage(`Detected: ${[metadata.year, metadata.stream].filter(Boolean).join(" ")}`);
    } else {
      // No metadata detected, proceed normally
      setTargetClass(targetClass);
      processFileImport(file);
    }
  };

  const processFileImport = async (file: File) => {
    setIsProcessing(true);
    setStatus("idle");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawMatrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as any[][];
      
      if (rawMatrix.length === 0) {
        throw new Error("The Excel file appears to be completely empty.");
      }

      // Use detected class if available, otherwise use UI selection
      const classToUse = detectedMetadata?.class || targetClass;
      const response = await importStudents(rawMatrix, classToUse);

      if (response.error) {
        throw new Error(response.error);
      }

      setStatus("success");
      setMessage(response.success || `Imported successfully! Applied class: ${classToUse}`);
      setImportedSATS(response.importedSATS || []);
      setImportedCount(response.importedCount || 0);
      setDetectedMetadata(null);
      setPendingFile(null);
      
      // Auto-redirect after 5 seconds ONLY if user doesn't click Undo
      // User has time to see and click the Undo button if needed
      const redirectTimer = setTimeout(() => {
        router.push("/dashboard/students");
      }, 5000);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Failed to process the Excel file.");
    } finally {
      setIsProcessing(false);
      setIsDragging(false);
    }
  };

  const processFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawMatrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as any[][];
      
      if (rawMatrix.length === 0) {
        throw new Error("The Excel file appears to be completely empty.");
      }

      // First, try to detect metadata
      renderMetadataDetection(file, rawMatrix);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Failed to process the Excel file.");
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      const file = files[0];
      const name = file.name.toLowerCase();
      if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
        processFile(file);
      } else {
        setStatus("error");
        setMessage("Only valid Excel (.xlsx/.xls) or CSV files are supported.");
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      const result = await deleteStudentsBySTAS(importedSATS);
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Reset to idle state for new upload
      setStatus("idle");
      setMessage("");
      setImportedSATS([]);
      setImportedCount(0);
      setIsDragging(false);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Failed to undo the import.");
    } finally {
      setIsUndoing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="w-full bg-slate-50 border-2 border-indigo-200 rounded-[2.5rem] h-80 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-400/5 animate-pulse" />
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Processing massive batch...</h3>
        <p className="text-sm font-bold text-slate-500 mt-2">Mapping columns to database schema</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-[2.5rem] p-8 shadow-lg">
        <div className="flex items-start gap-4 mb-6">
          <CheckCircle className="w-16 h-16 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">✅ Import Successful!</h3>
            <p className="text-sm font-bold text-emerald-700 mt-2 whitespace-pre-line">{message}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1">📊 {importedCount} student records imported</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 mb-6">
          <p className="text-xs font-bold text-slate-600 mb-3">⚠️ Redirecting to Student Directory in 5 seconds...</p>
          <p className="text-xs text-slate-500">
            If you uploaded the <strong>wrong file by mistake</strong>, click the <strong>"UNDO IMPORT"</strong> button below to delete these records and upload the correct file.
          </p>
        </div>

        <button
          onClick={handleUndo}
          disabled={isUndoing}
          className="w-full px-4 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 hover:text-rose-800 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-rose-300"
        >
          {isUndoing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Undoing import...
            </>
          ) : (
            <>
              <RotateCcw className="w-5 h-5" /> Undo Import (Wrong File)
            </>
          )}
        </button>
      </div>
    );
  }

  // Metadata Detection Confirmation Dialog
  if (status === "metadata-detection" && detectedMetadata && pendingFile) {
    return (
      <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-[2.5rem] p-8 shadow-lg">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
            <Info className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-800 mb-1">📋 File Context Detected</h3>
            <p className="text-sm font-semibold text-slate-600">We found important context in your file. Please confirm the details below.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {detectedMetadata.year && (
            <div className="bg-white p-4 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Year Detected</p>
              <p className="text-lg font-black text-blue-600">{detectedMetadata.year}</p>
            </div>
          )}
          {detectedMetadata.class && (
            <div className="bg-white p-4 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Class</p>
              <p className="text-lg font-black text-blue-600">{detectedMetadata.class}</p>
            </div>
          )}
          {detectedMetadata.stream && (
            <div className="bg-white p-4 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Stream</p>
              <p className="text-lg font-black text-blue-600">{detectedMetadata.stream}</p>
            </div>
          )}
          {detectedMetadata.section && (
            <div className="bg-white p-4 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Section</p>
              <p className="text-lg font-black text-blue-600">Section {detectedMetadata.section}</p>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Override Class (Optional)</p>
          <input 
            type="text" 
            value={targetClass}
            onChange={(e) => setTargetClass(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-300 text-slate-800 rounded-lg font-bold shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Leave blank to use detected class"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setStatus("idle");
              setDetectedMetadata(null);
              setPendingFile(null);
              setMessage("");
            }}
            className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => pendingFile && processFileImport(pendingFile)}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Import with Detected Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Class Tagging Setup */}
      {status === "idle" && !isProcessing && (
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Target Class / Section</h4>
            <p className="text-xs font-semibold text-slate-500">Default if not detected in file</p>
          </div>
          <input 
            type="text" 
            value={targetClass}
            onChange={(e) => setTargetClass(e.target.value)}
            className="w-48 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl font-bold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="e.g. 1st PUC Arts"
          />
        </div>
      )}

      {/* Main Dropzone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative w-full border-2 border-dashed rounded-[2.5rem] h-80 flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm
        ${isDragging ? 'bg-indigo-50 border-indigo-500 scale-[1.02] shadow-xl' : 'bg-white border-blue-300 hover:bg-blue-50/50 hover:border-blue-400'}
      `}
    >
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".xlsx, .xls, .csv" 
          className="hidden"
          onChange={handleFileInput}
        />
        
        {status === "error" ? (
          <div className="flex flex-col items-center text-center p-6 bg-red-50 rounded-3xl mb-4 border border-red-100">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <p className="text-sm font-bold text-red-700">{message}</p>
            <p className="text-xs font-semibold text-red-400 mt-1">Please try again with a valid file.</p>
          </div>
        ) : (
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner pointer-events-none transition-transform group-hover:scale-110">
            <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-indigo-600 animate-bounce' : 'text-blue-600'}`} />
          </div>
        )}

        <h3 className="text-2xl font-black text-slate-700 tracking-tight mb-2 pointer-events-none">
          {isDragging ? 'Drop file to ingest instantly' : 'Drag and drop students.xlsx'}
        </h3>
        <p className="text-slate-500 font-medium mb-6 pointer-events-none">File titles like "2nd PUC Science" are auto-detected</p>
        
        <div className="pointer-events-none bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_4px_15px_rgba(255,140,0,0.3)] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2">
          Select File <Download className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
