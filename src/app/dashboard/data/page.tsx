import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Database, Plus, Upload, Search, FileText, ArrowRight } from "lucide-react";

export default async function DataRecordsPage() {
  const session = await getSession();
  if (!session || !session.organizationId) redirect("/login");

  const orgId = session.organizationId;

  const [records, total, schemas] = await Promise.all([
    prisma.dataRecord.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        schema: { select: { name: true } },
        _count: { select: { documents: true } },
      },
    }),
    prisma.dataRecord.count({ where: { organizationId: orgId } }),
    prisma.dataSchema.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            Data Records
          </h2>
          <p className="text-slate-500 font-medium mt-2">
            <strong className="text-blue-600">{total}</strong> records in your workspace.
            Import business data from spreadsheets or add records manually.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/data/schemas"
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 border border-slate-200"
          >
            <FileText className="w-4 h-4" /> Schemas
          </Link>
          <Link
            href="/dashboard/data/imports"
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 border border-blue-200"
          >
            <Upload className="w-4 h-4" /> Import Data
          </Link>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-black text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Unique ID</th>
                <th className="px-6 py-4">Display Name</th>
                <th className="px-6 py-4">Schema</th>
                <th className="px-6 py-4">Documents</th>
                <th className="px-6 py-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                        <Database className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold">No data records yet.</p>
                      <p className="text-slate-400 text-sm">
                        Import a spreadsheet or add records manually to get started.
                      </p>
                      <Link
                        href="/dashboard/data/imports"
                        className="text-blue-600 hover:text-blue-800 font-bold text-sm underline flex items-center gap-1"
                      >
                        Import your first data <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record: any) => {
                  const data = record.data ? JSON.parse(record.data) : {};
                  return (
                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                          {record.uniqueId}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-bold">
                        {record.displayName || data.name || record.uniqueId}
                      </td>
                      <td className="px-6 py-4">
                        {record.schema ? (
                          <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-md text-xs font-bold border border-violet-100">
                            {record.schema.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-emerald-600">
                          {record._count.documents}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(record.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
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
