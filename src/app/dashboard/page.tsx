import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText, Upload, Database, Shield, TrendingUp,
  ArrowRight, Clock, CheckCircle2, XCircle, AlertTriangle, BarChart3, Key,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || !session.organizationId) redirect("/login");

  const orgId = session.organizationId;

  // Fetch all metrics in parallel
  const [org, totalRecords, totalDocuments, issuedDocs, revokedDocs, draftDocs, recentDocs, recentImports] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.dataRecord.count({ where: { organizationId: orgId } }),
      prisma.document.count({ where: { organizationId: orgId } }),
      prisma.document.count({ where: { organizationId: orgId, status: { in: ["ISSUED", "VALID"] } } }),
      prisma.document.count({ where: { organizationId: orgId, status: "REVOKED" } }),
      prisma.document.count({ where: { organizationId: orgId, status: "DRAFT" } }),
      prisma.document.findMany({
        where: { organizationId: orgId },
        orderBy: { issueDate: "desc" },
        take: 5,
        include: { record: { select: { displayName: true, uniqueId: true } } },
      }),
      prisma.dataImport.findMany({
        where: { organizationId: orgId },
        orderBy: { importedAt: "desc" },
        take: 3,
      }),
    ]);

  const templates = await prisma.documentTemplate.count({
    where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
  });

  const metrics = [
    {
      label: "Data Records",
      value: totalRecords,
      icon: Database,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      href: "/dashboard/data",
    },
    {
      label: "Documents Generated",
      value: totalDocuments,
      icon: FileText,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      href: "/dashboard/documents",
    },
    {
      label: "Issued & Valid",
      value: issuedDocs,
      icon: CheckCircle2,
      color: "from-green-500 to-teal-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      href: "/dashboard/documents",
    },
    {
      label: "Revoked",
      value: revokedDocs,
      icon: XCircle,
      color: "from-red-500 to-rose-600",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      href: "/dashboard/documents",
    },
    {
      label: "Templates",
      value: templates,
      icon: BarChart3,
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-violet-50",
      textColor: "text-violet-700",
      href: "/dashboard/templates",
    },
    {
      label: "Pending Drafts",
      value: draftDocs,
      icon: Clock,
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      href: "/dashboard/documents",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            Welcome back 👋
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            <strong className="text-slate-700">{org?.name || "Organization"}</strong>{" "}
            <span className="text-slate-400">•</span>{" "}
            <span className="text-blue-600 font-bold">{org?.industry || "General"}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/data"
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 border border-blue-200"
          >
            <Upload className="w-4 h-4" /> Import Data
          </Link>
          <Link
            href="/dashboard/documents"
            className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_4px_15px_rgba(0,180,80,0.3)] px-5 py-2.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Generate Document
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link
              key={metric.label}
              href={metric.href}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className={`w-10 h-10 ${metric.bgColor} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${metric.textColor}`} />
              </div>
              <p className="text-2xl font-black text-slate-800">{metric.value}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">{metric.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Two-column: Recent Documents + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              Recent Documents
            </h3>
            <Link href="/dashboard/documents" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentDocs.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-slate-400 font-bold text-sm">No documents generated yet.</p>
                <Link href="/dashboard/templates" className="text-blue-600 font-bold text-sm mt-2 inline-block hover:underline">
                  Get started with templates →
                </Link>
              </div>
            ) : (
              recentDocs.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      doc.status === "ISSUED" || doc.status === "VALID" ? "bg-emerald-500" :
                      doc.status === "REVOKED" ? "bg-red-500" :
                      doc.status === "DRAFT" ? "bg-amber-500" : "bg-blue-500"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {doc.record?.displayName || doc.record?.uniqueId || doc.documentNumber}
                      </p>
                      <p className="text-xs text-slate-400">{doc.documentNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-full ${
                      doc.status === "ISSUED" || doc.status === "VALID" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                      doc.status === "REVOKED" ? "bg-red-50 text-red-700 border border-red-100" :
                      "bg-slate-50 text-slate-600 border border-slate-200"
                    }`}>
                      {doc.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(doc.issueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions + Recent Imports */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-lg text-white">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Link href="/dashboard/data" className="flex items-center justify-between bg-white/10 hover:bg-white/15 backdrop-blur-sm px-4 py-3 rounded-xl transition-all group">
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold">Import Business Data</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/dashboard/templates" className="flex items-center justify-between bg-white/10 hover:bg-white/15 backdrop-blur-sm px-4 py-3 rounded-xl transition-all group">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-bold">Upload Template</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/dashboard/documents" className="flex items-center justify-between bg-white/10 hover:bg-white/15 backdrop-blur-sm px-4 py-3 rounded-xl transition-all group">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold">Generate Documents</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Recent Imports */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-black text-slate-700">Recent Imports</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {recentImports.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-xs text-slate-400 font-bold">No data imported yet.</p>
                </div>
              ) : (
                recentImports.map((imp: any) => (
                  <div key={imp.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{imp.fileName}</p>
                      <p className="text-xs text-slate-400">{imp.recordCount} records</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(imp.importedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Platform Info Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Document Verification Active
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            All generated documents include QR verification codes linked to{" "}
            <strong className="text-blue-700">{process.env.NEXT_PUBLIC_BASE_URL || "your domain"}</strong>
          </p>
        </div>
        <Link
          href="/dashboard/integrations"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shrink-0"
        >
          <Key className="w-4 h-4" /> Manage API Keys
        </Link>
      </div>
    </div>
  );
}
