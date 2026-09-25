"use client"

import { Building2, MapPin, Hash, CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { updateOrganizationSettings } from "@/app/actions/settings-actions";

export default function SettingsForm({ organization }: { organization: any }) {
  const [state, formAction] = useActionState(updateOrganizationSettings, null);

  return (
    <form className="space-y-6" action={formAction}>
      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {state.success}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-1">Official Organization Name</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <input
            id="name" name="name" type="text"
            defaultValue={organization.name || ""}
            className="block w-full pl-11 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="registrationNumber" className="block text-sm font-bold text-slate-700 mb-1">Official Registration Number (Tax/Govt/License ID)</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Hash className="h-5 w-5 text-slate-400" />
          </div>
          <input
            id="registrationNumber" name="registrationNumber" type="text"
            defaultValue={organization.registrationNumber || ""}
            className="block w-full pl-11 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-bold text-slate-700 mb-1">Full Organization Address</label>
        <div className="relative">
          <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none">
            <MapPin className="h-5 w-5 text-slate-400" />
          </div>
          <textarea
            id="address" name="address" rows={3}
            defaultValue={organization.address || ""}
            className="block w-full pl-11 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100">
        <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4">Record ID Configuration</h3>
        <p className="text-sm text-slate-500 mb-4 font-medium">Define exactly how the system auto-generates custom record unique IDs. Use {'{AUTO}'} to automatically increase the number.</p>
        
        <label htmlFor="idFormat" className="block text-sm font-bold text-slate-700 mb-1">ID Format Example</label>
        <input
          id="idFormat" name="idFormat" type="text"
          defaultValue={organization.idFormat || "REC-{AUTO}"}
          className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-indigo-50/50 text-indigo-900 font-mono font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-lg tracking-widest"
          placeholder="REC-2026-{AUTO}"
        />
        <div className="mt-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md w-fit">
          Preview: REC-2026-0001, REC-2026-0002...
        </div>
      </div>

      <div className="pt-6">
        <button type="submit" className="px-8 py-3.5 border border-transparent rounded-xl shadow-indigo-500/30 text-sm font-bold text-white bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg hover:-translate-y-0.5 transition-all">
          Save All Settings
        </button>
      </div>

    </form>
  )
}
