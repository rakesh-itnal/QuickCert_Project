"use client";

import { useState, useEffect } from "react";
import { generateSingleCertificate } from "@/app/actions/certificate-actions";
import { Award, Download, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import SearchableStudentSelect from "@/components/SearchableStudentSelect";

export default function GenerateCertificatePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [templateType, setTemplateType] = useState<string>("STUDY_B");
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [fieldChoices, setFieldChoices] = useState<Record<string, string>>({});

  const [fromClass, setFromClass] = useState("PUC-I");
  const [toClass, setToClass] = useState("PUC-II");
  const [yearFrom, setYearFrom] = useState("2023-24");
  const [yearTo, setYearTo] = useState("2024-25");
  const [motherTongue, setMotherTongue] = useState("Kannada");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  // Fetch students and templates on mount
  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => setStudents(data.students || []))
      .catch(() => {});

    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.templates) {
          setCustomTemplates(data.templates.filter((t: any) => t.instituteId));
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = () => {
    if (!selectedStudentId) return;
    if (choiceFields.length > 0) {
      setIsChoiceModalOpen(true);
    } else {
      executeGenerate();
    }
  };

  const executeGenerate = async () => {
    setIsChoiceModalOpen(false);
    setIsLoading(true);
    setResult(null);

    const response = await generateSingleCertificate({
      studentId: selectedStudentId,
      templateType,
      studiedFromClass: fromClass,
      studiedToClass: toClass,
      academicYearFrom: yearFrom,
      academicYearTo: yearTo,
      motherTongue,
      customChoices: fieldChoices,
    });

    setResult(response);
    setIsLoading(false);

    // Auto-download if successful
    if (response.success && response.pdfBase64) {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${response.pdfBase64}`;
      link.download = response.fileName || "certificate.pdf";
      link.click();
    }
  };

  const standardTemplates: { value: string; label: string; desc: string; isCustom: boolean; rawTemplate?: any }[] = [
    { value: "STUDY_A", label: "Study Certificate — Type A", desc: "Simple format (Basic style)", isCustom: false },
    { value: "STUDY_B", label: "Study Certificate — Type B", desc: "Detailed with Mother Tongue (Standard PU style)", isCustom: false },
    { value: "STUDY_C", label: "Study Certificate — Type C", desc: "School address format (Modern style)", isCustom: false },
    { value: "STUDY_KANNADA", label: "ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ", desc: "Kannada Admission Certificate", isCustom: false },
  ];

  const allTemplates = [
    ...standardTemplates,
    ...customTemplates.map(t => ({
      value: t.id,
      label: t.name,
      desc: "Custom Smart Map Template",
      isCustom: true,
      rawTemplate: t
    }))
  ];

  const selectedTemplateDetails = allTemplates.find(t => t.value === templateType);
  
  let choiceFields: any[] = [];
  if (selectedTemplateDetails?.isCustom && selectedTemplateDetails.rawTemplate?.fieldMappings) {
    try {
      const blueprint = JSON.parse(selectedTemplateDetails.rawTemplate.fieldMappings);
      if (blueprint.fields) {
        choiceFields = blueprint.fields.filter((f: any) => f.choices && f.choices.length > 0);
      }
    } catch (e) {}
  }


  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
          <Award className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Generate Certificate</h2>
          <p className="text-slate-500 font-medium">Select a student, choose a template, and generate a verified PDF.</p>
        </div>
      </div>

      {result?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> {result.error}
        </div>
      )}

      {result?.success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" /> Certificate generated and downloaded successfully!
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-6">
        
        {/* Student Selection */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Select Student</label>
          <SearchableStudentSelect
            students={students}
            selectedStudentId={selectedStudentId}
            onSelect={(studentId) => setSelectedStudentId(studentId)}
          />
        </div>

        {/* Template Selection */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Certificate Template</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allTemplates.map((t) => (
              <div
                key={t.value}
                className={`relative rounded-xl border-2 transition-all flex flex-col ${
                  templateType === t.value
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTemplateType(t.value);
                    setFieldChoices({});
                  }}
                  className="text-left p-4 flex-1"
                >
                  <p className={`text-sm font-bold flex items-center gap-2 ${templateType === t.value ? "text-emerald-700" : "text-slate-800"}`}>
                    {t.isCustom && <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Custom</span>}
                    {t.label}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1">{t.desc}</p>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Choice List Selections moved to generation modal */}

        {/* Academic Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">From Standard</label>
            <input
              value={fromClass} onChange={(e) => setFromClass(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="PUC-I"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">To Standard</label>
            <input
              value={toClass} onChange={(e) => setToClass(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="PUC-II"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Academic Year From</label>
            <input
              value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="2023-24"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Academic Year To</label>
            <input
              value={yearTo} onChange={(e) => setYearTo(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="2024-25"
            />
          </div>
        </div>

        {/* Mother Tongue (for Type B) */}
        {templateType === "STUDY_B" && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Mother Tongue</label>
            <input
              value={motherTongue} onChange={(e) => setMotherTongue(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Kannada"
            />
          </div>
        )}

        {/* Generate Button */}
        <div className="pt-4">
          <button
            onClick={handleGenerate}
            disabled={!selectedStudentId || isLoading}
            className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              !selectedStudentId || isLoading
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_6px_20px_rgba(0,180,80,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,180,80,0.4)]"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" /> Generate & Download PDF
              </>
            )}
          </button>
        </div>
      </div>
      {isChoiceModalOpen && choiceFields.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-indigo-600" /> Confirm Details
              </h3>
              <button onClick={() => setIsChoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600 font-medium">
                Please select the appropriate options for this certificate before generating.
              </p>
              <div className="space-y-4">
                {choiceFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">{field.label || "Choice Field"}</label>
                    <select
                      value={fieldChoices[field.id] || ""}
                      onChange={(e) => setFieldChoices(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="">-- Select Option --</option>
                      {field.choices.map((choice: string) => (
                        <option key={choice} value={choice}>{choice}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsChoiceModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeGenerate}
                disabled={choiceFields.some(f => !fieldChoices[f.id])}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
