import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Settings } from "lucide-react";
import SettingsForm from "./client-form";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || !session.organizationId) {
    redirect("/login");
  }

  // Fetch the Organization Profile Data
  const organization = await prisma.organization.findUnique({
    where: { id: session.organizationId }
  });

  if (!organization) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
          <Settings className="w-7 h-7 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Organization Settings</h2>
          <p className="text-slate-500 font-medium">Configure your core branding and document generation options</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 max-w-2xl">
        <SettingsForm organization={organization} />
      </div>

    </div>
  );
}
