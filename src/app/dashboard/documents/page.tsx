import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText, Plus, Download, Shield, Calendar, Clock,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-slate-50 text-slate-600 border-slate-200", icon: Clock },
  GENERATED: { label: "Generated", color: "bg-blue-50 text-blue-700 border-blue-200", icon: FileText },
  APPROVED: { label: "Approved", color: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: CheckCircle2 },
  SIGNED: { label: "Signed", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Shield },
  ISSUED: { label: "Issued", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  VALID: { label: "Valid", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  REVOKED: { label: "Revoked", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  SUPERSEDED: { label: "Superseded", color: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertTriangle },
  EXPIRED: { label: "Expired", color: "bg-gray-50 text-gray-700 border-gray-200", icon: Clock },
};

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session || !session.organizationId) redirect("/login");

  const orgId = session.organizationId;

  const documents = await prisma.document.findMany({
    where: { organizationId: orgId },
    include: {
      record: { select: { displayName: true, uniqueId: true } },
      template: { select: { name: true } },
      definition: { select: { name: true, category: true } },
    },
    orderBy: { issueDate: "desc" },
    take: 100,
  });

  // Status counts
  const statusCounts = documents.reduce((acc: Record<string, number>, doc: any) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            Document Vault
          </h2>
          <p className="text-slate-500 font-medium mt-2">
            <strong className="text-emerald-600">{documents.length}</strong> documents tracked.
            Generate, issue, verify, and manage document lifecycle.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/templates"
            className="bg-violet-50 text-violet-700 hover:bg-violet-100 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 border border-violet-200"
          >
            <Plus className="w-4 h-4" /> New Template
          </Link>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const Icon = config.icon;
          return (
            <div
              key={status}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${config.color}`}
            >
              <Icon className="w-3 h-3" />
              {config.label}
              <span className="bg-white/50 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-black text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Document #</th>
                <th className="px-6 py-4">Subject / Record</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Issued On</th>
                <th className="px-6 py-4">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold">No documents generated yet.</p>
                      <Link
                        href="/dashboard/templates"
                        className="text-emerald-600 hover:text-emerald-800 font-bold text-sm underline flex items-center gap-1"
                      >
                        Start by configuring a template <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc: any) => {
                  const statusInfo = STATUS_CONFIG[doc.status] || STATUS_CONFIG.DRAFT;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={doc.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold">
                          {doc.documentNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-bold">
                        {doc.record?.displayName || doc.record?.uniqueId || "Direct Document"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-md text-xs font-bold border border-violet-100">
                          {doc.definition?.name || doc.template?.name || "Document"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(doc.issueDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/v/${doc.qrValidationKey}`}
                          target="_blank"
                          className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          {doc.qrValidationKey.slice(0, 8)}...
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
