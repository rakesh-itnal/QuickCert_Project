export interface FieldMapping {
  // Field identifier matching CertificateData (e.g., "studentName", "dob")
  fieldId: string;
  
  // Positional and boundary properties (bounding box)
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Typography mapping
  fontSize: number;    // The ideal/max font size
  fontFamily: string;  // e.g. "Times Roman", "Helvetica", "Noto Sans"
  fontWeight: "normal" | "bold" | "italic";
  colorHex: string;    // e.g. "#000000"
  
  // Alignment within the box
  alignment: "left" | "center" | "right";
}

export interface TemplateDefinition {
  version: number;
  fields: FieldMapping[];
}

export type VLMFieldType = "line" | "box";

export interface HITLFieldMapping {
  id: string;
  label: string;
  type: VLMFieldType;
  bbox: [number, number, number, number];
  mapping_column: string | null;
  manual_text: string;
  choices?: string[];
}

export interface HITLTemplateBlueprint {
  version: number;
  engine: "gemini-hitl";
  templateId: string;
  templateName: string;
  sourceImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  fields: HITLFieldMapping[];
}
