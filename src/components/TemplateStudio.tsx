"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  X,
} from "lucide-react";
import type {
  HITLFieldMapping,
  HITLTemplateBlueprint,
} from "@/lib/template-types";

interface TemplateRecord {
  id: string;
  name: string;
  type: string;
  backgroundImageUrl: string;
  fieldMappings?: string | null;
}

interface TemplateStudioProps {
  template: TemplateRecord;
  onClose: () => void;
  onRefresh: () => void;
}

interface ActiveGesture {
  fieldId: string;
  action: "drag" | "resize";
  startX: number;
  startY: number;
  startBox: [number, number, number, number];
  stageWidth: number;
  stageHeight: number;
}

interface HitlRecommendResponse {
  image_width: number;
  image_height: number;
  fields: HITLFieldMapping[];
  detail?: string;
}

const HITL_BACKEND_URL =
  process.env.NEXT_PUBLIC_HITL_BACKEND_URL || "http://127.0.0.1:8001";

// Hardcoded matching exact Prisma schema columns (general business fields + legacy education fields for compatibility)
const DATABASE_COLUMNS = [
  "name",
  "uniqueId",
  "satsNumber",
  "admissionNumber",
  "issueDate",
  "expiresAt",
  "documentNumber",
  "organizationName",
  "registrationNumber",
  "fatherName",
  "motherName",
  "dob",
  "dobWords",
  "gender",
  "nationality",
  "religion",
  "caste",
  "subCaste",
  "isScSt",
  "motherTongue",
  "placeOfBirthVillage",
  "placeOfBirthTaluka",
  "placeOfBirthDistrict",
  "academicYearJoined",
  "academicYearLeft",
  "lastSchoolAttended",
  "dateOfAdmission",
  "classAdmittedTo",
  "stream",
  "substream",
  "streamSection",
  "mediumOfInstruction",
  "languagesStudied",
];

const DATABASE_COLUMN_LABELS: Record<string, string> = {
  name: "Subject / Entity Name",
  uniqueId: "Unique Record ID",
  satsNumber: "SATS / STS Number (Legacy)",
  admissionNumber: "Admission Number (Legacy)",
  issueDate: "Issue Date",
  expiresAt: "Expiration Date",
  documentNumber: "Document Number",
  organizationName: "Organization Name",
  registrationNumber: "Organization Reg Number",
  fatherName: "Father / Spouse's Name",
  motherName: "Mother's Name",
  dob: "Date of Birth / Formation",
  dobWords: "Date of Birth (Words)",
  gender: "Gender / Org Legal Type",
  nationality: "Nationality / Country",
  religion: "Religion / Classification",
  caste: "Caste",
  subCaste: "Sub-Caste",
  isScSt: "Belongs to SC/ST",
  motherTongue: "Mother Tongue",
  placeOfBirthVillage: "Place of Birth / Incorporation",
  placeOfBirthTaluka: "Place of Birth (Taluka)",
  placeOfBirthDistrict: "Place of Birth (District)",
  academicYearJoined: "Year Joined",
  academicYearLeft: "Year Left",
  lastSchoolAttended: "Previous Organization / School",
  dateOfAdmission: "Date of Admission / Enrollment",
  classAdmittedTo: "Department / Class",
  stream: "Stream / Division",
  substream: "Sub-stream / Section",
  streamSection: "Section",
  mediumOfInstruction: "Medium of Instruction",
  languagesStudied: "Languages Studied",
};

function isHitlBlueprint(value: unknown): value is HITLTemplateBlueprint {
  if (!value || typeof value !== "object") return false;
  const blueprint = value as Partial<HITLTemplateBlueprint>;
  return (
    blueprint.engine === "gemini-hitl" &&
    Array.isArray(blueprint.fields) &&
    typeof blueprint.sourceImageUrl === "string"
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value: number) {
  return `${value / 10}%`;
}

export default function TemplateStudio({
  template,
  onClose,
  onRefresh,
}: TemplateStudioProps) {
  const [fields, setFields] = useState<HITLFieldMapping[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const availableColumns = DATABASE_COLUMNS;
  const [status, setStatus] = useState("Analyzing the blank template...");
  const [statusTone, setStatusTone] = useState<"idle" | "error" | "success">("idle");
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [editingChoicesFieldId, setEditingChoicesFieldId] = useState<string | null>(null);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/institute/columns")
      .then((res) => res.json())
      .then((data) => {
        if (data.columns) {
          setCustomColumns(data.columns);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCreateCustomColumn = async () => {
    const name = window.prompt("Enter new column name:");
    if (!name?.trim()) return;
    const colName = name.trim();
    
    try {
      const res = await fetch("/api/institute/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnName: colName }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomColumns(data.columns);
        if (selectedFieldId) {
          updateField(selectedFieldId, { mapping_column: colName, manual_text: "" });
        }
      } else {
        alert("Failed to add custom column: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleOpenChoices = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    setEditingChoicesFieldId(fieldId);
    setCurrentChoices(field.choices && field.choices.length > 0 ? [...field.choices] : [""]);
    setIsChoiceModalOpen(true);
  };

  const handleSaveChoices = () => {
    if (!editingChoicesFieldId) return;
    const choices = currentChoices.map(c => c.trim()).filter(c => c.length > 0);
    updateField(editingChoicesFieldId, { choices: choices.length > 0 ? choices : undefined });
    setIsChoiceModalOpen(false);
    setEditingChoicesFieldId(null);
  };

  const addChoiceOption = () => {
    setCurrentChoices([...currentChoices, ""]);
  };

  const updateChoiceOption = (index: number, value: string) => {
    const newChoices = [...currentChoices];
    newChoices[index] = value;
    setCurrentChoices(newChoices);
  };

  const removeChoiceOption = (index: number) => {
    const newChoices = currentChoices.filter((_, i) => i !== index);
    setCurrentChoices(newChoices);
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeGesture, setActiveGesture] = useState<ActiveGesture | null>(null);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrapStudio() {
      setIsLoading(true);
      setStatusTone("idle");

      try {
        if (template.fieldMappings) {
          const parsed = JSON.parse(template.fieldMappings) as unknown;
          if (isHitlBlueprint(parsed)) {
            if (!cancelled) {
              setFields(parsed.fields);
              setImageWidth(parsed.imageWidth);
              setImageHeight(parsed.imageHeight);
              setSelectedFieldId(parsed.fields[0]?.id || null);
              setStatus("Loaded the saved Gemini blueprint. You can keep refining it.");
              setStatusTone("success");
              setIsLoading(false);
            }
            return;
          }
        }

        const imageResponse = await fetch(template.backgroundImageUrl);
        if (!imageResponse.ok) {
          throw new Error("Unable to load the uploaded template image.");
        }

        const imageBlob = await imageResponse.blob();
        if (!imageBlob.type.startsWith("image/")) {
          throw new Error("HITL mapping currently requires an image template upload.");
        }

        const formData = new FormData();
        formData.append(
          "file",
          new File([imageBlob], `${template.name}.png`, { type: imageBlob.type })
        );

        const recommendationResponse = await fetch(
          `${HITL_BACKEND_URL}/api/recommend-fields`,
          {
            method: "POST",
            body: formData,
          }
        );

        const payload = (await recommendationResponse.json()) as HitlRecommendResponse;

        if (!recommendationResponse.ok) {
          throw new Error(payload.detail || "Gemini failed to recommend fields.");
        }

        if (!cancelled) {
          setFields(payload.fields || []);
          setImageWidth(payload.image_width || 0);
          setImageHeight(payload.image_height || 0);
          setSelectedFieldId(payload.fields?.[0]?.id || null);
          setStatus(`Gemini recommended ${(payload.fields || []).length} writable regions. Adjust them and save the blueprint.`);
          setStatusTone("success");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Failed to initialize the HITL studio.");
          setStatusTone("error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapStudio();

    return () => {
      cancelled = true;
    };
  }, [template]);

  useEffect(() => {
    if (!activeGesture) return;

    function handlePointerMove(event: PointerEvent) {
      setFields((currentFields) =>
        currentFields.map((field) => {
          if (!activeGesture || field.id !== activeGesture.fieldId) return field;

          const deltaX = ((event.clientX - activeGesture.startX) / activeGesture.stageWidth) * 1000;
          const deltaY = ((event.clientY - activeGesture.startY) / activeGesture.stageHeight) * 1000;
          const [ymin, xmin, ymax, xmax] = activeGesture.startBox;

          if (activeGesture.action === "drag") {
            const height = ymax - ymin;
            const width = xmax - xmin;
            const nextYMin = clamp(ymin + deltaY, 0, 1000 - height);
            const nextXMin = clamp(xmin + deltaX, 0, 1000 - width);

            return {
              ...field,
              bbox: [Math.round(nextYMin), Math.round(nextXMin), Math.round(nextYMin + height), Math.round(nextXMin + width)],
            };
          }

          return {
            ...field,
            bbox: [ymin, xmin, Math.round(clamp(ymax + deltaY, ymin + 8, 1000)), Math.round(clamp(xmax + deltaX, xmin + 8, 1000))],
          };
        })
      );
    }

    function handlePointerUp() {
      setActiveGesture(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeGesture]);

  function updateField(fieldId: string, updates: Partial<HITLFieldMapping>) {
    setFields((currentFields) =>
      currentFields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field))
    );
  }

  function addField(type: "box" | "line") {
    const newField: HITLFieldMapping = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: `New ${type} field`,
      type,
      bbox: [400, 400, type === "line" ? 430 : 450, 600],
      mapping_column: null,
      manual_text: "",
      choices: undefined,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  function applyIdealBoxSize(sourceFieldId: string) {
    setFields((currentFields) => {
      const sourceField = currentFields.find((field) => field.id === sourceFieldId);

      if (!sourceField) {
        return currentFields;
      }

      const [sourceYMin, sourceXMin, sourceYMax, sourceXMax] = sourceField.bbox;
      const idealHeight = sourceYMax - sourceYMin;
      const idealWidth = sourceXMax - sourceXMin;

      return currentFields.map((field) => {
        if (field.id === sourceFieldId) {
          return field;
        }

        const [ymin, xmin] = field.bbox;
        const ymax = Math.round(clamp(ymin + idealHeight, ymin + 8, 1000));
        const xmax = Math.round(clamp(xmin + idealWidth, xmin + 8, 1000));

        return {
          ...field,
          bbox: [ymin, xmin, ymax, xmax],
        };
      });
    });

    setStatus("Applied the selected dimensions to all other fields.");
    setStatusTone("success");
  }

  function buildBlueprint(): HITLTemplateBlueprint {
    return {
      version: 2,
      engine: "gemini-hitl",
      templateId: template.id,
      templateName: template.name,
      sourceImageUrl: template.backgroundImageUrl,
      imageWidth,
      imageHeight,
      fields,
    };
  }

  async function handleSave() {
    setIsSaving(true);
    setStatusTone("idle");
    try {
      const response = await fetch("/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          fieldMappings: buildBlueprint(),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save blueprint.");
      }

      setStatus("Blueprint saved! Returning to dashboard...");
      setStatusTone("success");
      onRefresh();
      setTimeout(() => onClose(), 1200);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save blueprint.");
      setStatusTone("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateOverlay() {
    setIsGenerating(true);
    setStatusTone("idle");
    try {
      const response = await fetch(`${HITL_BACKEND_URL}/api/generate-overlay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: {
            template_id: template.id,
            source_image_url: template.backgroundImageUrl,
            image_width: imageWidth,
            image_height: imageHeight,
            fields,
          },
          record_index: 0,
          debug_guides: false,
          include_background: true,
        }),
      });

      const payload = (await response.json()) as { detail?: string; download_url?: string; };

      if (!response.ok || !payload.download_url) {
        throw new Error(payload.detail || "Failed to generate the overlay PDF.");
      }

      window.open(`${HITL_BACKEND_URL}${payload.download_url}`, "_blank");
      setStatus("Transparent overlay PDF generated with the approved blueprint.");
      setStatusTone("success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate the overlay PDF.");
      setStatusTone("error");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#f8f3ea]/90 backdrop-blur-sm font-serif text-[#1f2a37]">
      <div className="flex h-full flex-col xl:flex-row bg-[radial-gradient(circle_at_top_left,_rgba(17,68,170,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(209,67,67,0.12),_transparent_28%),linear-gradient(180deg,_#f8f3ea_0%,_#efe8db_100%)]">
        <aside className="w-full xl:w-[360px] border-b xl:border-b-0 xl:border-r border-black/10 bg-white/50 backdrop-blur-lg flex flex-col shadow-xl">
          <div className="px-6 py-5 border-b border-black/10 flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#1f2a37] mb-1">
                QuickCert Studio
              </h2>
              <p className="text-sm text-[#65707f] leading-snug font-sans">
                Human-in-the-loop certificate templating with Gemini field recommendations.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-[#ece4d3] p-2 text-[#1f2a37] transition-all hover:bg-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4 flex-none">
            <div className="bg-white/80 border border-black/10 rounded-2xl p-4 shadow-sm mb-4">
              <h3 className="font-bold text-lg mb-3">Blueprint Actions</h3>
              <div className="flex flex-col gap-3 font-sans">
                <button
                  onClick={() => void handleSave()}
                  disabled={isLoading || isSaving || fields.length === 0}
                  className="w-full rounded-full bg-gradient-to-br from-[#1144aa] to-[#3568ce] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#1144aa]/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving
                    </span>
                  ) : (
                    "Save Blueprint"
                  )}
                </button>
                <button
                  onClick={() => void handleGenerateOverlay()}
                  disabled={isLoading || isGenerating || fields.length === 0}
                  className="w-full rounded-full bg-[#ece4d3] px-4 py-3 text-sm font-bold text-[#1f2a37] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    "Generate Transparent PDF"
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 mt-4">
              <h3 className="font-bold text-lg">Detected Fields</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => addField("line")}
                  className="px-2 py-1 text-xs font-bold text-[#1f9d55] bg-[#1f9d55]/10 rounded-md hover:bg-[#1f9d55]/20 transition-colors"
                >
                  + Line
                </button>
                <button
                  onClick={() => addField("box")}
                  className="px-2 py-1 text-xs font-bold text-[#d14343] bg-[#d14343]/10 rounded-md hover:bg-[#d14343]/20 transition-colors"
                >
                  + Box
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <div className="space-y-2 pr-1 font-sans">
              {isLoading ? (
                <div className="text-center text-sm text-[#65707f] py-4">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Analyzing the blank certificate...
                </div>
              ) : fields.length === 0 ? (
                <div className="text-center text-sm text-[#65707f] py-4">
                  No fields yet.
                </div>
              ) : (
                fields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={`w-full text-left rounded-xl border border-black/10 bg-white px-3 py-2.5 transition-shadow hover:shadow-md ${
                      selectedFieldId === field.id ? "ring-2 ring-[#1144aa]/40" : ""
                    }`}
                    style={{
                      borderLeftWidth: "6px",
                      borderLeftColor: field.type === "line" ? "#1f9d55" : "#d14343",
                    }}
                  >
                    <strong className="text-sm block text-[#1f2a37] font-serif">{field.label}</strong>
                    <span className="text-xs text-[#65707f]">
                      {field.mapping_column || field.manual_text || "Unmapped"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-auto flex flex-col font-sans">
          <div className="mb-4 flex items-center justify-between bg-white/50 backdrop-blur-md rounded-full px-4 py-2 border border-black/5">
            <div className="flex items-center gap-4 text-sm text-[#65707f]">
              <span className="flex items-center gap-1.5">
                <span className="w-5 border-b-2 border-[#1f9d55] inline-block h-0"></span> Line field
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-3 border-2 border-[#d14343] inline-block"></span> Box field
              </span>
            </div>
            <div
              className={`text-sm font-medium ${
                statusTone === "error" ? "text-[#a53030]" : statusTone === "success" ? "text-[#0b7d43]" : "text-[#65707f]"
              }`}
            >
              {status}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[1080px] rounded-3xl border border-black/10 bg-gradient-to-br from-white/80 to-[#faf5ec]/90 p-6 shadow-2xl overflow-auto min-h-[520px]">
            <div className="relative inline-block w-full">
              <NextImage
                src={template.backgroundImageUrl}
                alt={template.name}
                width={imageWidth || 1200}
                height={imageHeight || 900}
                className="block h-auto w-full rounded-xl shadow-lg"
                unoptimized
              />

              <div 
                className="absolute inset-0"
                onPointerDown={() => setSelectedFieldId(null)}
              >
                {fields.map((field) => {
                  const [ymin, xmin, ymax, xmax] = field.bbox;
                  const isSelected = selectedFieldId === field.id;

                  return (
                    <div
                      key={field.id}
                      className={`absolute rounded-md cursor-move bg-white/10 backdrop-blur-[1px] transition-all ${
                        field.type === "line"
                          ? "border-b-[3px] border-[#1f9d55]/95"
                          : "border-2 border-[#d14343]/95"
                      } ${isSelected ? "shadow-[0_0_0_3px_rgba(17,68,170,0.28)] z-10" : "z-0"}`}
                      style={{
                        top: formatPercent(ymin),
                        left: formatPercent(xmin),
                        width: formatPercent(xmax - xmin),
                        height: formatPercent(ymax - ymin),
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        const stageRect = event.currentTarget.parentElement?.getBoundingClientRect();
                        if (!stageRect) return;

                        const target = event.target as HTMLElement;
                        const action = target.dataset.action === "resize" ? "resize" : "drag";

                        setSelectedFieldId(field.id);
                        setActiveGesture({
                          fieldId: field.id,
                          action,
                          startX: event.clientX,
                          startY: event.clientY,
                          startBox: [...field.bbox] as [number, number, number, number],
                          stageWidth: stageRect.width,
                          stageHeight: stageRect.height,
                        });
                      }}
                    >
                      <span className="absolute -top-6 left-0 bg-[#141b25]/90 text-white text-[12px] px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none font-sans">
                        {field.label}
                      </span>
                      <button
                        type="button"
                        data-action="resize"
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#1144aa] border-2 border-white cursor-nwse-resize"
                        onClick={(event) => event.preventDefault()}
                      />
                    </div>
                  );
                })}

                {selectedField ? (
                  <div
                    className="absolute z-20 w-[280px] rounded-2xl border border-black/10 bg-[#fffcf7]/95 p-4 text-[#1f2a37] shadow-[0_20px_50px_rgba(29,38,54,0.22)] font-sans"
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      top: `min(calc(${selectedField.bbox[2] / 10}% + 12px), calc(100% - 220px))`,
                      left: `min(${selectedField.bbox[1] / 10}%, calc(100% - 300px))`,
                    }}
                  >
                    <h3 className="text-base font-bold mb-1 font-serif">{selectedField.label}</h3>
                    <div className="text-xs text-[#65707f] mb-3">Type: {selectedField.type}</div>

                    <label className="block text-sm text-[#65707f] mb-1">Map to column</label>
                    <select
                      value={
                        selectedField.mapping_column || (selectedField.manual_text ? "__other__" : "")
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "__create_new__") {
                          handleCreateCustomColumn();
                          return;
                        }
                        if (value === "__other__") {
                          updateField(selectedField.id, { mapping_column: null });
                          return;
                        }

                        updateField(selectedField.id, {
                          mapping_column: value || null,
                          manual_text: value ? "" : selectedField.manual_text,
                        });
                      }}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1144aa]/30"
                    >
                      <option value="">Select a database column...</option>
                      <optgroup label="Standard Fields">
                        {DATABASE_COLUMNS.map((column) => (
                          <option key={column} value={column}>
                            {DATABASE_COLUMN_LABELS[column] || column}
                          </option>
                        ))}
                      </optgroup>
                      {customColumns.length > 0 && (
                        <optgroup label="Custom Fields">
                          {customColumns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__create_new__">✨ Create New Column...</option>
                      <option value="__other__">Other / Static Text</option>
                    </select>

                    {!selectedField.mapping_column ? (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-sm text-[#65707f] mb-1">Manual text override</label>
                          <input
                            type="text"
                            value={selectedField.manual_text}
                            onChange={(event) =>
                              updateField(selectedField.id, {
                                manual_text: event.target.value,
                                mapping_column: null,
                              })
                            }
                            placeholder="Enter custom text"
                            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1144aa]/30"
                          />
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenChoices(selectedField.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition-colors"
                          >
                            Interactive Choice List
                            {selectedField.choices && selectedField.choices.length > 0 && (
                              <span className="bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
                                {selectedField.choices.length}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyIdealBoxSize(selectedField.id)}
                        className="flex-1 rounded-full bg-white border border-black/10 px-3 py-2 text-xs font-bold text-[#1f2a37] transition-all hover:bg-slate-50"
                      >
                        Set as Ideal
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteField(selectedField.id)}
                        className="rounded-full bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>

      {isChoiceModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Configure Choice List</h3>
              <button onClick={() => setIsChoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Enter choices for this field. When you generate a certificate, you will be prompted to select one of these options.
              </p>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {currentChoices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => updateChoiceOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => removeChoiceOption(index)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove option"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addChoiceOption}
                className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                + Add Option
              </button>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsChoiceModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChoices}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save Choices
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
