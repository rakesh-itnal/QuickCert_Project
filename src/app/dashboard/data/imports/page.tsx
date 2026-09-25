import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Upload, Calendar, FileSpreadsheet, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function ImportsPage() {
  const session = await getSession();
  if (!session || !session.organizationId) redirect("/login");

  const imports = await prisma.dataImport.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { importedAt: "desc" },
    include: {
      _count: { select: { records: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          Data Imports
        </h2>
        <p className="text-slate-500 font-medium mt-2">
          View history of uploaded spreadsheets and bulk records added to the database.
        </p>
      </div>

      {/* Imports Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-black text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Import Details</th>
                <th className="px-6 py-4">Records Added</th>
                <th className="px-6 py-4">Imported At</th>
                <th className="px-6 py-4">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 mx-auto mb-3">
                        <Upload className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold">No spreadsheet imports yet.</p>
                      <p className="text-slate-400 text-sm">Upload bulk lists inside the Records directory.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                imports.map((imp: any) => (
                  <tr key={imp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{imp.fileName}</p>
                        <p className="text-xs text-slate-400">ID: {imp.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-blue-600 font-bold text-sm bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">
                        {imp._count.records} records
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 flex items-center gap-1.5 mt-2.5 border-none">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(imp.importedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {imp.fileSize ? `${(imp.fileSize / 1024).toFixed(1)} KB` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
