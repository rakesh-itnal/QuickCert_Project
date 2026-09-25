"use client";

import { useState } from "react";
import { FileUp, Loader2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { mergeStudentsAction } from "@/app/actions/merge-students-action";

export default function MergeExcelModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const records = XLSX.utils.sheet_to_json(firstSheet);

          if (records.length === 0) {
            setResult({ error: "Excel file is empty" });
            setIsUploading(false);
            return;
          }

          const res = await mergeStudentsAction(records);
          setResult(res);
          if (res.success) {
            setTimeout(() => setIsOpen(false), 3000);
          }
        } catch (err: any) {
          setResult({ error: err.message });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      setResult({ error: error.message });
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2 border border-emerald-200"
      >
        <FileSpreadsheet className="w-4 h-4" /> Merge Info via Excel
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-emerald-600" />
                Merge Extra Information
              </h3>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Upload an Excel file to add new custom columns to existing students. Must contain "STS Number" and "Name" columns to match records.
              </p>
            </div>

            <div className="p-6">
              {result?.error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                  {result.error}
                </div>
              )}
              {result?.success && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                  Successfully updated {result.updatedCount} students!
                </div>
              )}
              {result?.errors?.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-xs max-h-32 overflow-y-auto">
                  <p className="font-bold mb-1">Some records failed to match:</p>
                  <ul className="list-disc pl-4">
                    {result.errors.slice(0, 10).map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 10 && <li>...and {result.errors.length - 10} more.</li>}
                  </ul>
                </div>
              )}

              <div className="flex flex-col items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-200 rounded-xl cursor-pointer bg-emerald-50 hover:bg-emerald-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                    ) : (
                      <FileSpreadsheet className="w-8 h-8 text-emerald-500 mb-2" />
                    )}
                    <p className="text-sm font-bold text-emerald-700">
                      {isUploading ? "Merging Data..." : "Click to select Excel file"}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
