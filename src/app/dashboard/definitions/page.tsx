import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ClipboardCheck, Shield, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DefinitionsPage() {
  const session = await getSession();
  if (!session || !session.organizationId) redirect("/login");

  const definitions = await prisma.documentDefinition.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { documents: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
          </div>
          Document Definitions
        </h2>
        <p className="text-slate-500 font-medium mt-2">
          Manage the standard templates and business rule configurations for each document type in your organization.
        </p>
      </div>

      {/* Definitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {definitions.length === 0 ? (
          <div className="md:col-span-3 bg-white border border-slate-200 rounded-[2rem] p-12 text-center shadow-sm">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-600">No document definitions configured yet.</p>
            <p className="text-sm text-slate-400 mt-1">Definitions group layouts, data validation, and verification permissions.</p>
          </div>
        ) : (
          definitions.map((def: any) => (
            <div key={def.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                  {def.category || "General"}
                </span>
                <h3 className="font-black text-slate-800 text-lg mt-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  {def.name}
                </h3>
                <p className="text-slate-400 text-xs mt-1">Version {def.version}</p>
                <p className="text-slate-600 font-medium text-sm mt-3">{def.description || "No description provided."}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {def._count.documents} active documents
                </span>
                <span className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1">
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
