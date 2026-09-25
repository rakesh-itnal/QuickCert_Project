"use client";

import { useState, useEffect } from "react";
import { generateBulkCertificates } from "@/app/actions/certificate-actions";
import { Award, Download, Loader2, CheckCircle, AlertCircle, Users, Package, X } from "lucide-react";

export default function BulkGeneratePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templateType, setTemplateType] = useState<string>("STUDY_B");
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [fieldChoices, setFieldChoices] = useState<Record<string, string>>({});

  const [fromClass, setFromClass] = useState("PUC-I");
  const [toClass, setToClass] = useState("PUC-II");
  const [yearFrom, setYearFrom] = useState("2023-24");
  const [yearTo, setYearTo] = useState("2024-25");
  const [motherTongue, setMotherTongue] = useState("Kannada");
  const [filterClass, setFilterClass] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

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

  const uniqueClasses = [...new Set(students.map((s: any) => s.classAdmittedTo).filter(Boolean))];

  const filteredStudents = filterClass === "All"
    ? students
    : students.filter((s: any) => s.classAdmittedTo === filterClass);

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s: any) => s.id));
    }
  };

  const handleBulkGenerate = () => {
    if (selectedIds.length === 0) return;
    if (choiceFields.length > 0) {
      setIsChoiceModalOpen(true);
    } else {
      executeBulkGenerate();
    }
  };

  const executeBulkGenerate = async () => {
    setIsChoiceModalOpen(false);
    setIsLoading(true);
    setResult(null);

    const response = await generateBulkCertificates({
      studentIds: selectedIds,
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

    if (response.success && response.zipBase64) {
      const link = document.createElement("a");
      link.href = `data:application/zip;base64,${response.zipBase64}`;
      link.download = response.fileName || "bulk_certificates.zip";
      link.click();
    }
  };

  const standardTemplates: { value: string; label: string; rawTemplate?: any }[] = [
    { value: "STUDY_A", label: "Study Certificate — Type A" },
    { value: "STUDY_B", label: "Study Certificate — Type B" },
    { value: "STUDY_C", label: "Study Certificate — Type C" },
    { value: "STUDY_KANNADA", label: "ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ" },
  ];

  const allTemplates = [
    ...standardTemplates,
    ...customTemplates.map(t => ({
      value: t.id,
      label: `[Custom] ${t.name}`,
      rawTemplate: t
    }))
  ];

  const selectedTemplateDetails = allTemplates.find(t => t.value === templateType);
  
  let choiceFields: any[] = [];
  if (selectedTemplateDetails?.rawTemplate?.fieldMappings) {
    try {
      const blueprint = JSON.parse(selectedTemplateDetails.rawTemplate.fieldMappings);
      if (blueprint.fields) {
        choiceFields = blueprint.fields.filter((f: any) => f.choices && f.choices.length > 0);
      }
    } catch (e) {}
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
          <Package className="w-7 h-7 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Bulk Certificate Generation</h2>
          <p className="text-slate-500 font-medium">Select an entire class of students and generate all certificates as a ZIP download.</p>
        </div>
      </div>

      {result?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> {result.error}
        </div>
      )}

      {result?.success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" /> Successfully generated {result.count} certificates! ZIP downloading now.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Student Selection */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          {/* Class Filter */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 flex-wrap">
            <Users className="w-4 h-4 text-slate-400" />
            <button
              onClick={() => setFilterClass("All")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterClass === "All" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              All ({students.length})
            </button>
            {uniqueClasses.map((cls: any) => (
              <button
                key={cls}
                onClick={() => setFilterClass(cls)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterClass === cls ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {cls} ({students.filter((s: any) => s.classAdmittedTo === cls).length})
              </button>
            ))}
          </div>

          {/* Select All */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-bold text-slate-700">
                Select All ({filteredStudents.length})
              </span>
            </label>
            <span className="text-sm font-bold text-indigo-600">{selectedIds.length} selected</span>
          </div>

          {/* Student List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {filteredStudents.map((st: any) => (
              <label
                key={st.id}
                className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors ${
                  selectedIds.includes(st.id) ? "bg-indigo-50" : "hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(st.id)}
                  onChange={() => toggleStudent(st.id)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{st.name}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {st.satsNumber} {st.classAdmittedTo ? `· ${st.classAdmittedTo}` : ""}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Right: Config Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Configuration</h3>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Template</label>
              <div className="flex items-center gap-2">
                <select
                  value={templateType}
                  onChange={(e) => {
                    setTemplateType(e.target.value);
                    setFieldChoices({});
                  }}
                  className="flex-1 min-w-0 truncate px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                >
                  {allTemplates.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <a
                  href={`/api/preview-pdf?type=${templateType}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm transition-colors border border-indigo-200 shadow-sm whitespace-nowrap"
                  title="Preview selected template"
                >
                  Demo
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From Std</label>
                <input value={fromClass} onChange={(e) => setFromClass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To Std</label>
                <input value={toClass} onChange={(e) => setToClass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year From</label>
                <input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year To</label>
                <input value={yearTo} onChange={(e) => setYearTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>

            {templateType === "STUDY_B" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mother Tongue</label>
                <input value={motherTongue} onChange={(e) => setMotherTongue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            )}

            {/* Choice List Selections moved to modal */}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleBulkGenerate}
            disabled={selectedIds.length === 0 || isLoading}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-base transition-all ${
              selectedIds.length === 0 || isLoading
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-[0_6px_20px_rgba(100,50,255,0.3)] hover:-translate-y-0.5"
            }`}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Generating {selectedIds.length} PDFs...</>
            ) : (
              <><Download className="w-5 h-5" /> Generate ZIP ({selectedIds.length} certificates)</>
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
                Please select the appropriate options for these certificates before generating.
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
                onClick={executeBulkGenerate}
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
