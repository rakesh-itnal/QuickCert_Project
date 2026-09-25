import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Shield, Users, FileText, Building2, AlertTriangle,
  CheckCircle, Database, Activity, Layers
} from "lucide-react";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role !== "ADMIN") redirect("/dashboard");

  const [
    totalOrganizations,
    totalRecords,
    totalDocuments,
    totalUsers,
    totalTemplates,
    organizations,
    recentDocuments,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.dataRecord.count(),
    prisma.document.count(),
    prisma.user.count(),
    prisma.documentTemplate.count(),
    prisma.organization.findMany({
      include: {
        _count: { select: { dataRecords: true, documents: true, users: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.document.findMany({
      include: { record: true, organization: true },
      orderBy: { issueDate: "desc" },
      take: 10,
    }),
  ]);

  // Data integrity checks
  const orphanedRecords = await prisma.dataRecord.count({
    where: { displayName: { equals: "" } },
  });
  const duplicateCheck = await prisma.dataRecord.groupBy({
    by: ["uniqueId", "organizationId"],
    _count: true,
    having: { uniqueId: { _count: { gt: 1 } } },
  });
  const recordsNoId = await prisma.dataRecord.count({
    where: { uniqueId: "" },
  });

  const integrityIssues = orphanedRecords + duplicateCheck.length + recordsNoId;
  type OrganizationRow = (typeof organizations)[number];
  type RecentDocumentRow = (typeof recentDocuments)[number];
  type GroupedDocuments = Record<string, { name: string; docs: RecentDocumentRow[] }>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/30">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">QuickCert Super Admin</h1>
              <p className="text-xs text-slate-500 font-medium">System-wide monitoring & data integrity</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
          >
            <Layers className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Organizations", value: totalOrganizations, icon: Building2, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { label: "Data Records", value: totalRecords, icon: Database, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { label: "Documents", value: totalDocuments, icon: FileText, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
            { label: "Users", value: totalUsers, icon: Users, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
            { label: "Templates", value: totalTemplates, icon: Layers, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`p-4 rounded-2xl border ${stat.color} flex flex-col gap-3`}
            >
              <stat.icon className="w-5 h-5" />
              <div>
                <p className="text-2xl font-black">{stat.value.toLocaleString()}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Data Integrity Report */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Database className="w-4 h-4" /> Data Integrity
              </h2>
              {integrityIssues === 0 ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  ✓ ALL CLEAR
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  {integrityIssues} Issues
                </span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Check: Empty names */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                <div className="flex items-center gap-3">
                  {orphanedRecords === 0 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-sm font-medium text-slate-300">Empty record names</span>
                </div>
                <span className={`text-sm font-bold ${orphanedRecords === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {orphanedRecords}
                </span>
              </div>

              {/* Check: Duplicate IDs */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                <div className="flex items-center gap-3">
                  {duplicateCheck.length === 0 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-slate-300">Duplicate record uniqueIds</span>
                </div>
                <span className={`text-sm font-bold ${duplicateCheck.length === 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {duplicateCheck.length}
                </span>
              </div>

              {/* Check: Missing IDs */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                <div className="flex items-center gap-3">
                  {recordsNoId === 0 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-sm font-medium text-slate-300">Records without uniqueId</span>
                </div>
                <span className={`text-sm font-bold ${recordsNoId === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {recordsNoId}
                </span>
              </div>

              {/* System Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium text-slate-300">Database status</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">Online</span>
              </div>
            </div>
          </div>

          {/* Registered Organizations */}
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Registered Organizations ({organizations.length})
              </h2>
            </div>

            {organizations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm font-medium">
                No organizations registered yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {organizations.map((org: OrganizationRow) => (
                  <div
                    key={org.id}
                    className="px-6 py-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                        <Building2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{org.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {org.address || "No address"} · Slug: {org.slug}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold text-blue-400">{org._count.dataRecords} records</p>
                        <p className="text-xs text-slate-500">{org._count.documents} docs · {org._count.users} users</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        org.subscriptionStatus === "active" || org.subscriptionStatus === "business"
                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                          : "text-slate-500 bg-slate-800 border border-slate-700"
                      }`}>
                        {org.subscriptionStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Documents — Grouped by Organization */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Recent Documents (Grouped by Organization)
            </h2>
          </div>

          {recentDocuments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">
              No documents generated across any organization yet.
            </div>
          ) : (
            <div>
              {/* Group documents by organization */}
              {(() => {
                const grouped: GroupedDocuments = {};
                recentDocuments.forEach((doc: RecentDocumentRow) => {
                  const orgId = doc.organizationId || "unknown";
                  const orgName = doc.organization?.name || "Unknown Organization";
                  if (!grouped[orgId]) {
                    grouped[orgId] = { name: orgName, docs: [] };
                  }
                  grouped[orgId].docs.push(doc);
                });

                return Object.entries(grouped).map(([orgId, group]) => (
                  <div key={orgId}>
                    {/* Organization Header */}
                    <div className="px-6 py-3 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center border border-blue-500/20">
                          <Building2 className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{group.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                            {group.docs.length} document{group.docs.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Latest: {new Date(group.docs[0].issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {/* Documents under this organization */}
                    <div className="divide-y divide-slate-800/50">
                      {group.docs.map((doc: RecentDocumentRow) => (
                        <div
                          key={doc.id}
                          className="px-6 pl-[4.5rem] py-3 hover:bg-slate-800/20 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-200 truncate">{doc.record?.displayName || doc.documentNumber}</p>
                              <p className="text-xs text-slate-500 truncate">
                                Status: {doc.status} · QR: {doc.qrValidationKey.slice(0, 8)}…
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 font-medium whitespace-nowrap ml-4">
                            {new Date(doc.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
