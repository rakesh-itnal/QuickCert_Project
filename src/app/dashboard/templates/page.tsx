"use client";

import { useState, useEffect, useRef } from "react";
import {
  Layers, Upload, Plus, Trash2, FileText, Image as ImageIcon, ChevronDown,
  CheckCircle, AlertCircle, Loader2, Eye, X, Tag, Shield, ArrowRight, Settings2
} from "lucide-react";
import TemplateStudio from "@/components/TemplateStudio";
import type { HITLTemplateBlueprint } from "@/lib/template-types";

interface TemplateRecord {
  id: string;
  name: string;
  type: string;
  backgroundImageUrl: string;
  instituteId?: string | null;
  fieldMappings?: string | null;
}

interface ResultState {
  success?: boolean;
  message?: string;
  error?: string;
}

const TEMPLATE_TYPES = [
  { value: "BONAFIDE", label: "Bonafide Certificate", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "TRANSFER", label: "Transfer Certificate (TC)", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "STUDY", label: "Study Certificate", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "LEAVING", label: "Leaving Certificate", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "CHARACTER", label: "Character Certificate", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "MIGRATION", label: "Migration Certificate", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "CONDUCT", label: "Conduct Certificate", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "ADMISSION", label: "Admission Certificate", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "CUSTOM", label: "Custom / Other", color: "bg-slate-50 text-slate-700 border-slate-200" },
];

export default function CustomTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);

  // Upload form state
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("BONAFIDE");
  const [customType, setCustomType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hitlBackendUrl =
    process.env.NEXT_PUBLIC_HITL_BACKEND_URL || "http://127.0.0.1:8001";

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill name from filename if empty
      if (!templateName) {
        const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTemplateName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateName) return;

    const finalType = templateType === "CUSTOM" ? (customType || "CUSTOM") : templateType;

    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", templateName);
    formData.append("type", finalType);

    try {
      const res = await fetch("/api/templates", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setResult({
          success: true,
          message: `${data.message} Opening Gemini Blueprint Studio...`,
        });
        setTemplateName("");
        setTemplateType("BONAFIDE");
        setCustomType("");
        setSelectedFile(null);
        setShowUploadPanel(false);
        fetchTemplates();
        setEditingTemplate(data.template);
      } else {
        setResult({ error: data.error });
      }
    } catch {
      setResult({ error: "Upload failed. Please try again." });
    }

    setIsUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const res = await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      fetchTemplates();
      setResult({ success: true, message: "Template deleted." });
    }
  };

  const handleDemoClick = async (tmpl: TemplateRecord) => {
    if (tmpl.instituteId) {
      try {
        const parsed = tmpl.fieldMappings
          ? (JSON.parse(tmpl.fieldMappings) as HITLTemplateBlueprint)
          : null;

        if (
          parsed?.engine === "gemini-hitl" &&
          Array.isArray(parsed.fields) &&
          parsed.fields.length > 0
        ) {
          setLoadingDemo(tmpl.id);
          const res = await fetch(`${hitlBackendUrl}/api/generate-overlay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blueprint: {
                template_id: parsed.templateId,
                source_image_url: parsed.sourceImageUrl,
                image_width: parsed.imageWidth,
                image_height: parsed.imageHeight,
                fields: parsed.fields,
              },
              record_index: 0,
              debug_guides: true,
              include_background: false,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.download_url) {
            throw new Error(data.detail || "Failed to generate overlay preview");
          }

          setPreviewUrl(`${hitlBackendUrl}${data.download_url}`);
          return;
        }

        setResult({
          error:
            "Open Smart Map first, review the Gemini blueprint, and save it before generating a demo overlay.",
        });
        return;
      } catch (error) {
        setResult({
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate overlay preview.",
        });
        return;
      } finally {
        setLoadingDemo(null);
      }
    }

    setLoadingDemo(tmpl.id);
    try {
      const url = `/api/preview-pdf?${tmpl.type.startsWith('CUSTOM') ? `id=${tmpl.id}` : `type=${tmpl.type}`}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate preview");
      
      const arrayBuffer = await res.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch {
      alert("AI Processing took too long or failed. Please check the console.");
    } finally {
      setLoadingDemo(null);
    }
  };

  const handleDemo1Click = async (tmpl: TemplateRecord) => {
    if (!tmpl.instituteId && !tmpl.type.startsWith("CUSTOM")) {
      alert("Demo 1 is only available for custom HITL blueprints.");
      return;
    }

    setLoadingDemo(`demo1-${tmpl.id}`);
    try {
      if (tmpl.fieldMappings) {
        const parsed = JSON.parse(tmpl.fieldMappings);
        if (parsed.engine === "gemini-hitl") {
          const res = await fetch(`${hitlBackendUrl}/api/generate-overlay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blueprint: {
                template_id: tmpl.id,
                source_image_url: tmpl.backgroundImageUrl,
                image_width: parsed.imageWidth,
                image_height: parsed.imageHeight,
                fields: parsed.fields,
              },
              record_index: 0,
              debug_guides: true,
              include_background: true,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.download_url) {
            throw new Error(data.detail || "Failed to generate full preview");
          }

          setPreviewUrl(`${hitlBackendUrl}${data.download_url}`);
          return;
        }

        setResult({
          error: "Full demo requires a saved Smart Map blueprint.",
        });
      }
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Failed to generate preview.",
      });
    } finally {
      setLoadingDemo(null);
    }
  };

  const getTypeInfo = (type: string) => {
    return TEMPLATE_TYPES.find((t) => t.value === type) || TEMPLATE_TYPES[TEMPLATE_TYPES.length - 1];
  };

  const getFileIcon = (url: string) => {
    if (url.endsWith(".pdf")) return <FileText className="w-5 h-5 text-red-500" />;
    return <ImageIcon className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-violet-600" />
            </div>
            Custom Templates
          </h2>
          <p className="text-slate-500 font-medium mt-2">
            Upload your own certificate formats. Specify the type (Bonafide, TC, etc.) for easy access later.
          </p>
        </div>
        <button
          onClick={() => setShowUploadPanel(!showUploadPanel)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            showUploadPanel
              ? "bg-slate-200 text-slate-600"
              : "bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-[0_4px_15px_rgba(120,80,220,0.3)] hover:-translate-y-0.5"
          }`}
        >
          {showUploadPanel ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showUploadPanel ? "Cancel" : "Upload New Template"}
        </button>
      </div>

      {/* Alerts */}
      {result?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> {result.error}
        </div>
      )}
      {result?.success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" /> {result.message}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PREDEFINED BUILT-IN TEMPLATES (always visible — never removed)   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-blue-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
              Predefined Templates (Built-in)
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            4 Ready to Use
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Type A */}
          <a href="/api/preview-pdf?type=STUDY_A" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-6 py-5 hover:bg-emerald-50/30 transition-colors group">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">Study Certificate — Type A</p>
              <p className="text-xs text-slate-500 mt-0.5">Simple format (Basic style)</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">STUDY</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
          </a>

          {/* Type B */}
          <a href="/api/preview-pdf?type=STUDY_B" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-6 py-5 hover:bg-blue-50/30 transition-colors group">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">Study Certificate — Type B</p>
              <p className="text-xs text-slate-500 mt-0.5">Detailed with Mother Tongue (Standard PU style)</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">STUDY + MOTHER TONGUE</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
          </a>

          {/* Type C */}
          <a href="/api/preview-pdf?type=STUDY_C" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-6 py-5 hover:bg-orange-50/30 transition-colors group">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">Study Certificate — Type C</p>
              <p className="text-xs text-slate-500 mt-0.5">School address format (Modern style)</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">STUDY + ADDRESS</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all shrink-0" />
          </a>

          {/* Kannada */}
          <a href="/api/preview-pdf?type=KANNADA_ADMISSION" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-6 py-5 hover:bg-purple-50/30 transition-colors group">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">ಶಾಲಾ ದಾಖಲಾತಿ ಪ್ರಮಾಣ ಪತ್ರ</p>
              <p className="text-xs text-slate-500 mt-0.5">Kannada Admission Certificate</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">ಕನ್ನಡ</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all shrink-0" />
          </a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* UPLOAD NEW CUSTOM TEMPLATE                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Upload Panel */}
      {showUploadPanel && (
        <div className="bg-white rounded-[2rem] border-2 border-violet-200 shadow-lg p-8 space-y-6 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Upload className="w-5 h-5 text-violet-500" /> Upload a New Certificate Format
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: File Upload */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Upload Blank Certificate Image
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                    selectedFile
                      ? "border-violet-400 bg-violet-50"
                      : "border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/30"
                  }`}
                >
                  {selectedFile ? (
                    <>
                      {getFileIcon(selectedFile.name)}
                      <p className="text-sm font-bold text-violet-700 mt-2">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm font-bold text-slate-600">Click to select a blank certificate image</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG, or WebP works best for Gemini field detection</p>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Right: Template Info */}
            <div className="space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Template Name
                </label>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Official Bonafide Certificate 2025"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Certificate Type */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4" /> Certificate Type
                </label>
                <div className="relative">
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none appearance-none cursor-pointer"
                  >
                    {TEMPLATE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Custom type input (shown when "Custom / Other" is selected) */}
              {templateType === "CUSTOM" && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Specify Your Custom Type
                  </label>
                  <input
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="e.g. Sports Achievement, NCC Certificate"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="pt-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !templateName || isUploading}
              className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-base transition-all ${
                !selectedFile || !templateName || isUploading
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-[0_6px_20px_rgba(120,80,220,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(120,80,220,0.4)]"
              }`}
            >
              {isUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-5 h-5" /> Upload & Save Template</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider">
            Your Uploaded Templates ({templates.length})
          </h3>
        </div>

        {templates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center border border-slate-100 mb-3">
              <Upload className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold">No custom templates uploaded yet.</p>
            <p className="text-slate-400 text-sm mt-1">
              Use the &quot;Upload New Template&quot; button above to add your own Bonafide, TC, or other certificate formats.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {templates.map((tmpl) => {
              const typeInfo = getTypeInfo(tmpl.type);
              return (
                <div
                  key={tmpl.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-violet-50/20 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* File icon */}
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                      {getFileIcon(tmpl.backgroundImageUrl)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-800 truncate">{tmpl.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {tmpl.backgroundImageUrl.split(".").pop()?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDemoClick(tmpl)}
                      disabled={loadingDemo === tmpl.id || loadingDemo === `demo1-${tmpl.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-colors disabled:opacity-50"
                      title="Preview generated overlay text only"
                    >
                      {loadingDemo === tmpl.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      Demo
                    </button>

                    {tmpl.instituteId && (
                      <button
                        onClick={() => handleDemo1Click(tmpl)}
                        disabled={loadingDemo === tmpl.id || loadingDemo === `demo1-${tmpl.id}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold text-xs transition-colors disabled:opacity-50"
                        title="Preview final certificate with background"
                      >
                        {loadingDemo === `demo1-${tmpl.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        Demo 1 (Full)
                      </button>
                    )}

                    {/* Configure Fields for institute-owned custom templates */}
                    {tmpl.instituteId && (
                      <button
                        onClick={() => setEditingTemplate(tmpl)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 font-bold text-xs transition-colors"
                        title="Open Gemini Blueprint Studio"
                      >
                        <Settings2 className="w-4 h-4" />
                        Smart Map
                      </button>
                    )}

                    {/* Delete (only if institute-owned, not global) */}
                    {tmpl.instituteId && (
                      <button
                        onClick={() => handleDelete(tmpl.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-800">Template Preview</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              <iframe
                src={previewUrl}
                title="Certificate Template Preview"
                className="w-full h-[65vh] rounded-xl border border-slate-200 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Template Smart Map Studio Modal */}
      {editingTemplate && (
        <TemplateStudio
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onRefresh={fetchTemplates}
        />
      )}
    </div>
  );
}
