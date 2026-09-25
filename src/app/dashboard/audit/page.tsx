import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  History, FileText, Database, Upload, Shield, Key, UserPlus,
  XCircle, Edit, Trash2, CheckCircle2, Eye,
} from "lucide-react";

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  DOCUMENT_CREATED: { label: "Document Created", icon: FileText, color: "text-blue-500 bg-blue-50" },
  DOCUMENT_GENERATED: { label: "Document Generated", icon: FileText, color: "text-emerald-500 bg-emerald-50" },
  DOCUMENT_APPROVED: { label: "Document Approved", icon: CheckCircle2, color: "text-cyan-500 bg-cyan-50" },
  DOCUMENT_SIGNED: { label: "Document Signed", icon: Shield, color: "text-indigo-500 bg-indigo-50" },
  DOCUMENT_ISSUED: { label: "Document Issued", icon: CheckCircle2, color: "text-green-500 bg-green-50" },
  DOCUMENT_VIEWED: { label: "Document Viewed", icon: Eye, color: "text-slate-500 bg-slate-50" },
  DOCUMENT_VERIFIED: { label: "Document Verified", icon: Shield, color: "text-emerald-500 bg-emerald-50" },
  DOCUMENT_REVOKED: { label: "Document Revoked", icon: XCircle, color: "text-red-500 bg-red-50" },
  DOCUMENT_SUPERSEDED: { label: "Document Superseded", icon: Edit, color: "text-amber-500 bg-amber-50" },
  DOCUMENT_DOWNLOADED: { label: "Document Downloaded", icon: FileText, color: "text-blue-500 bg-blue-50" },
  TEMPLATE_CREATED: { label: "Template Created", icon: FileText, color: "text-violet-500 bg-violet-50" },
  TEMPLATE_UPDATED: { label: "Template Updated", icon: Edit, color: "text-violet-500 bg-violet-50" },
  TEMPLATE_DELETED: { label: "Template Deleted", icon: Trash2, color: "text-red-500 bg-red-50" },
  DATA_IMPORTED: { label: "Data Imported", icon: Upload, color: "text-blue-500 bg-blue-50" },
  RECORD_CREATED: { label: "Record Created", icon: Database, color: "text-blue-500 bg-blue-50" },
  RECORD_UPDATED: { label: "Record Updated", icon: Edit, color: "text-slate-500 bg-slate-50" },
  RECORD_DELETED: { label: "Record Deleted", icon: Trash2, color: "text-red-500 bg-red-50" },
  SCHEMA_CREATED: { label: "Schema Created", icon: Database, color: "text-violet-500 bg-violet-50" },
  SCHEMA_UPDATED: { label: "Schema Updated", icon: Edit, color: "text-violet-500 bg-violet-50" },
  API_KEY_CREATED: { label: "API Key Created", icon: Key, color: "text-amber-500 bg-amber-50" },
  API_KEY_REVOKED: { label: "API Key Revoked", icon: XCircle, color: "text-red-500 bg-red-50" },
  ORGANIZATION_UPDATED: { label: "Organization Updated", icon: Edit, color: "text-slate-500 bg-slate-50" },
  USER_INVITED: { label: "User Invited", icon: UserPlus, color: "text-emerald-500 bg-emerald-50" },
  USER_REMOVED: { label: "User Removed", icon: XCircle, color: "text-red-500 bg-red-50" },
};

export default async function AuditPage() {
  const session = await getSession();
  if (!session || !session.organizationId) redirect("/login");

  const events = await prisma.auditEvent.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <History className="w-6 h-6 text-slate-600" />
          </div>
          Audit Log
        </h2>
        <p className="text-slate-500 font-medium mt-2">
          Complete, immutable record of all actions in your workspace.
          <strong className="text-slate-700"> {events.length}</strong> events tracked.
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {events.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 mx-auto mb-3">
                <History className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold">No audit events yet.</p>
              <p className="text-slate-400 text-sm mt-1">Events will appear here as you use the platform.</p>
            </div>
          ) : (
            events.map((event: any) => {
              const config = ACTION_CONFIG[event.action] || {
                label: event.action,
                icon: History,
                color: "text-slate-500 bg-slate-50",
              };
              const Icon = config.icon;
              const meta = event.metadata ? JSON.parse(event.metadata) : {};

              return (
                <div key={event.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{config.label}</p>
                      {event.documentNumber && (
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                          {event.documentNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      {event.actorName && (
                        <span className="font-bold text-slate-600">{event.actorName}</span>
                      )}
                      {event.actorRole && (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500">
                          {event.actorRole}
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(event.timestamp).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {/* Show select metadata */}
                    {meta.reason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {meta.reason}</p>
                    )}
                    {meta.fileName && (
                      <p className="text-xs text-slate-400 mt-1">File: {meta.fileName}</p>
                    )}
                    {meta.recordCount !== undefined && (
                      <p className="text-xs text-slate-400 mt-1">{meta.recordCount} records</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
