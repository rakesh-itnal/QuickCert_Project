import { getDocumentForVerification } from "@/lib/services/document-service";
import { CheckCircle, XCircle, Shield, Calendar, Building2, FileText, AlertTriangle, Clock, Hash, ArrowRight } from "lucide-react";
import Link from "next/link";

const STATUS_UI: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any; description: string }> = {
  ISSUED: {
    label: "VERIFIED ✓",
    color: "text-emerald-800",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
    description: "This document is authentic and has been issued by a registered organization.",
  },
  VALID: {
    label: "VERIFIED ✓",
    color: "text-emerald-800",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
    description: "This document is authentic, valid, and currently active.",
  },
  DRAFT: {
    label: "DRAFT",
    color: "text-slate-800",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    icon: Clock,
    description: "This document exists but has not yet been officially issued.",
  },
  GENERATED: {
    label: "PENDING ISSUANCE",
    color: "text-blue-800",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: FileText,
    description: "This document has been generated and is pending final issuance.",
  },
  APPROVED: {
    label: "APPROVED — PENDING ISSUANCE",
    color: "text-cyan-800",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    icon: CheckCircle,
    description: "This document has been approved and is awaiting issuance.",
  },
  REVOKED: {
    label: "REVOKED ✗",
    color: "text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
    description: "This document has been officially revoked and is no longer valid.",
  },
  SUPERSEDED: {
    label: "SUPERSEDED",
    color: "text-amber-800",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: AlertTriangle,
    description: "This document has been replaced by a newer version.",
  },
  EXPIRED: {
    label: "EXPIRED",
    color: "text-gray-800",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Clock,
    description: "This document has passed its expiration date.",
  },
};

export default async function VerifyPage(
  props: { params: Promise<{ key: string }> }
) {
  const params = await props.params;
  const key = params.key;

  const document = await getDocumentForVerification(key);

  const statusUI = document ? STATUS_UI[document.status] || STATUS_UI.DRAFT : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">QuickCert Verification</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Document Authenticity Check</p>
        </div>

        {document && statusUI ? (
          <div className={`bg-white rounded-3xl border ${statusUI.borderColor} shadow-lg overflow-hidden`}>
            {/* Status Banner */}
            <div className={`${statusUI.bgColor} px-6 py-5 border-b ${statusUI.borderColor} flex items-center gap-3`}>
              <statusUI.icon className={`w-8 h-8 ${statusUI.color}`} />
              <div>
                <h2 className={`text-lg font-black ${statusUI.color}`}>{statusUI.label}</h2>
                <p className={`text-xs font-bold ${statusUI.color} opacity-80`}>{statusUI.description}</p>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              {/* Document Number */}
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Number</p>
                  <p className="text-lg font-black text-slate-800 font-mono">{document.documentNumber}</p>
                </div>
              </div>

              {/* Issuing Organization */}
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issuing Organization</p>
                  <p className="text-base font-bold text-slate-800">{document.organizationName || "N/A"}</p>
                  {document.organizationRegNumber && (
                    <p className="text-xs text-slate-500 font-medium">Reg: {document.organizationRegNumber}</p>
                  )}
                </div>
              </div>

              {/* Document Type */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-bold text-slate-800">{document.documentType}</p>
                </div>
                {document.documentCategory && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</p>
                    <p className="text-sm font-bold text-slate-800">{document.documentCategory}</p>
                  </div>
                )}
              </div>

              {/* Issue Date & Version */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issued On</p>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(document.issueDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Version</p>
                  <p className="text-sm font-bold text-slate-800">v{document.version}</p>
                </div>
              </div>

              {/* Revocation Details */}
              {document.status === "REVOKED" && document.revokedAt && (
                <div className="pt-3 border-t border-red-100 bg-red-50/50 -mx-6 px-6 py-3 mt-3">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Revocation Details</p>
                  <p className="text-sm text-red-800 font-bold">
                    Revoked on {new Date(document.revokedAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                  {document.revokedReason && (
                    <p className="text-xs text-red-700 mt-1">Reason: {document.revokedReason}</p>
                  )}
                </div>
              )}

              {/* Expiration */}
              {document.expiresAt && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expires</p>
                  <p className="text-sm font-bold text-slate-800">
                    {new Date(document.expiresAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              )}

              {/* Document Hash */}
              {document.documentHash && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Integrity Hash (SHA-256)</p>
                  <p className="text-[10px] font-mono text-slate-400 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {document.documentHash}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-red-200 shadow-lg overflow-hidden">
            <div className="bg-red-50 px-6 py-5 border-b border-red-100 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <h2 className="text-lg font-black text-red-800">NOT FOUND</h2>
                <p className="text-xs font-bold text-red-600">This document could not be verified. It may be forged or invalid.</p>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-slate-600 font-medium">
                The QR code you scanned does not match any document in our system.
                If you believe this is an error, please contact the issuing organization directly.
              </p>
              <p className="text-xs font-mono text-slate-400 mt-4">Key: {key}</p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 font-medium mt-6">
          Powered by QuickCert • Secure Document Verification Platform
        </p>
      </div>
    </div>
  );
}
