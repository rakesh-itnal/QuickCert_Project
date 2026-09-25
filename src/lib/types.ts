// =============================================================================
// QuickCert V2 — Core Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Organization Types
// -----------------------------------------------------------------------------

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  address?: string | null;
  country?: string | null;
  timezone?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  industry?: string | null;
  orgType?: string | null;
  registrationNumber?: string | null;
  idFormat: string;
  subscriptionStatus: string;
}

// -----------------------------------------------------------------------------
// Data Schema Types
// -----------------------------------------------------------------------------

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "email"
  | "phone"
  | "currency"
  | "select"
  | "multiline"
  | "json";

export interface SchemaFieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  validation?: string;
  defaultValue?: string;
  format?: string;
  options?: string[];         // For select type
  description?: string;
}

export interface DataSchemaData {
  id: string;
  name: string;
  description?: string | null;
  fields: SchemaFieldDefinition[];
  version: number;
  isActive: boolean;
  organizationId: string;
}

// -----------------------------------------------------------------------------
// Data Record Types
// -----------------------------------------------------------------------------

export interface DataRecordData {
  id: string;
  uniqueId: string;
  displayName?: string | null;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  schemaId?: string | null;
  organizationId: string;
}

// -----------------------------------------------------------------------------
// Document Definition Types
// -----------------------------------------------------------------------------

export interface DocumentDefinitionData {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  version: number;
  status: string;
  fieldDefinitions: DocumentFieldDef[];
  validationRules: ValidationRule[];
  workflowConfig: WorkflowConfig;
  signatureConfig: SignatureConfig;
  verificationConfig: VerificationConfig;
  schemaId?: string | null;
  templateId?: string | null;
  organizationId: string;
}

export interface DocumentFieldDef {
  sourceField: string;        // Field name in the data record
  templateField: string;      // Field name in the template mapping
  label: string;
  required: boolean;
  format?: string;            // e.g., date format, number format
  transform?: string;         // e.g., "uppercase", "date:DD/MM/YYYY"
}

export interface ValidationRule {
  field: string;
  rule: string;               // e.g., "required", "minLength:3", "regex:..."
  message: string;
}

export interface WorkflowConfig {
  requireApproval?: boolean;
  approvalLevels?: number;
  autoIssue?: boolean;
  requireSignature?: boolean;
}

export interface SignatureConfig {
  required: boolean;
  type?: "manual" | "digital" | "none";
  signerRoles?: string[];
}

export interface VerificationConfig {
  level: "basic" | "standard" | "detailed" | "private";
  publicFields?: string[];    // Fields visible on public verification page
  requireAuth?: boolean;      // Require authentication to see details
}

// -----------------------------------------------------------------------------
// Document Template Types
// -----------------------------------------------------------------------------

export interface DocumentTemplateData {
  id: string;
  name: string;
  category: string;
  version: number;
  isActive: boolean;
  backgroundImageUrl: string;
  fieldMappings: string;
  organizationId?: string | null;
}

// -----------------------------------------------------------------------------
// Document Types (the core entity)
// -----------------------------------------------------------------------------

export type DocumentStatus =
  | "DRAFT"
  | "GENERATED"
  | "APPROVED"
  | "SIGNED"
  | "ISSUED"
  | "VALID"
  | "REVOKED"
  | "SUPERSEDED"
  | "EXPIRED";

export interface DocumentData {
  id: string;
  documentNumber: string;
  documentHash?: string | null;
  status: DocumentStatus;
  issueDate: Date;
  version: number;
  previousVersionId?: string | null;
  supersededById?: string | null;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  revokedById?: string | null;
  expiresAt?: Date | null;
  dataSnapshot: Record<string, unknown>;
  dynamicFields?: Record<string, unknown>;
  qrValidationKey: string;
  signatureData?: Record<string, unknown>;
  recordId?: string | null;
  definitionId?: string | null;
  templateId?: string | null;
  templateVersionNumber?: number | null;
  organizationId: string;
}

// -----------------------------------------------------------------------------
// Document Generation Types
// -----------------------------------------------------------------------------

export interface GenerateDocumentRequest {
  definitionId?: string;
  templateId?: string;
  recordId?: string;
  data?: Record<string, unknown>;
  organizationData?: Partial<OrganizationData>;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  autoIssue?: boolean;
  includeQR?: boolean;
  qrBaseUrl?: string;
  debugGuides?: boolean;
  includeBackground?: boolean;
}

export interface GenerateDocumentResult {
  documentId: string;
  documentNumber: string;
  status: DocumentStatus;
  verificationUrl: string;
  pdfBase64?: string;
  fileName?: string;
}

// -----------------------------------------------------------------------------
// Verification Types
// -----------------------------------------------------------------------------

export interface VerificationResult {
  valid: boolean;
  status: DocumentStatus;
  documentNumber?: string;
  issuerName?: string;
  documentType?: string;
  issuedAt?: string;
  version?: number;
  revokedAt?: string;
  revokedReason?: string;
  supersededBy?: string;
  publicFields?: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Audit Event Types
// -----------------------------------------------------------------------------

export type AuditAction =
  | "DOCUMENT_CREATED"
  | "DOCUMENT_GENERATED"
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_SIGNED"
  | "DOCUMENT_ISSUED"
  | "DOCUMENT_VIEWED"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_REVOKED"
  | "DOCUMENT_SUPERSEDED"
  | "DOCUMENT_DOWNLOADED"
  | "TEMPLATE_CREATED"
  | "TEMPLATE_UPDATED"
  | "TEMPLATE_DELETED"
  | "DATA_IMPORTED"
  | "RECORD_CREATED"
  | "RECORD_UPDATED"
  | "RECORD_DELETED"
  | "SCHEMA_CREATED"
  | "SCHEMA_UPDATED"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "ORGANIZATION_UPDATED"
  | "USER_INVITED"
  | "USER_REMOVED";

export interface AuditEventData {
  id: string;
  action: AuditAction;
  timestamp: Date;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  documentId?: string | null;
  documentNumber?: string | null;
  metadata?: Record<string, unknown>;
  organizationId: string;
}

// -----------------------------------------------------------------------------
// API Key Types
// -----------------------------------------------------------------------------

export interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  organizationId: string;
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  key: string;           // Only returned ONCE at creation time
  keyPrefix: string;
  scopes: string[];
}

// -----------------------------------------------------------------------------
// Role & Permission Types
// -----------------------------------------------------------------------------

export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "OPERATOR"
  | "APPROVER"
  | "AUDITOR"
  | "VIEWER";

export type Permission =
  | "manage_organization"
  | "manage_users"
  | "manage_data"
  | "create_templates"
  | "edit_templates"
  | "generate_documents"
  | "approve_documents"
  | "sign_documents"
  | "revoke_documents"
  | "view_audit_logs"
  | "manage_api_keys"
  | "manage_billing"
  | "view_documents"
  | "view_data";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "manage_organization", "manage_users", "manage_data",
    "create_templates", "edit_templates", "generate_documents",
    "approve_documents", "sign_documents", "revoke_documents",
    "view_audit_logs", "manage_api_keys", "manage_billing",
    "view_documents", "view_data",
  ],
  ADMIN: [
    "manage_users", "manage_data",
    "create_templates", "edit_templates", "generate_documents",
    "approve_documents", "sign_documents", "revoke_documents",
    "view_audit_logs", "manage_api_keys",
    "view_documents", "view_data",
  ],
  MANAGER: [
    "manage_data", "create_templates", "edit_templates",
    "generate_documents", "approve_documents", "revoke_documents",
    "view_audit_logs", "view_documents", "view_data",
  ],
  OPERATOR: [
    "manage_data", "generate_documents",
    "view_documents", "view_data",
  ],
  APPROVER: [
    "approve_documents", "sign_documents",
    "view_documents", "view_data",
  ],
  AUDITOR: [
    "view_audit_logs", "view_documents", "view_data",
  ],
  VIEWER: [
    "view_documents", "view_data",
  ],
};

// -----------------------------------------------------------------------------
// Industry Presets
// -----------------------------------------------------------------------------

export const INDUSTRIES = [
  "General",
  "HR",
  "Manufacturing",
  "Healthcare",
  "Insurance",
  "Logistics",
  "Automotive",
  "Construction",
  "Professional Training",
  "Finance",
  "Education",
  "Government",
  "Compliance",
  "Legal",
  "Technology",
] as const;

export const ORG_TYPES = [
  "Company",
  "Hospital",
  "Factory",
  "Laboratory",
  "HR Department",
  "Insurance Company",
  "Logistics Company",
  "Training Organization",
  "School",
  "University",
  "Government Department",
  "Non-Profit",
] as const;
