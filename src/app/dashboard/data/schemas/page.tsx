import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FolderOpen, Settings2, Calendar, FileText } from "lucide-react";
import Link from "next/link";

export default async function SchemasPage() {
  const session = await getSession();
  if (!session || !session.organizationId) redirect("/login");

  const schemas = await prisma.dataSchema.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { dataRecords: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-violet-600" />
          </div>
          Data Schemas
        </h2>
        <p className="text-slate-500 font-medium mt-2">
          Define dynamic structural fields (Employee, Product, etc.) that represent the business data in your organization.
        </p>
      </div>

      {/* Schemas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {schemas.length === 0 ? (
          <div className="md:col-span-3 bg-white border border-slate-200 rounded-[2rem] p-12 text-center shadow-sm">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-600">No custom schemas defined yet.</p>
            <p className="text-sm text-slate-400 mt-1">Schemas allow custom fields like PART-NO, INSPECTION-DATE, etc.</p>
          </div>
        ) : (
          schemas.map((schema: any) => {
            const fields = JSON.parse(schema.fields || "[]");
            return (
              <div key={schema.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-500" />
                    {schema.name}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Version {schema.version}</p>
                  <p className="text-slate-600 font-medium text-sm mt-3">{schema.description || "No description provided."}</p>
                  
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {fields.map((f: any) => (
                      <span key={f.name} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200" title={f.type}>
                        {f.label || f.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    {schema._count.dataRecords} records mapping to this schema
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
