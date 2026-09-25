"use client"

import { useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { deleteStudentsRange } from "@/app/actions/student-actions";

export default function DeleteStudentsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [fromSats, setFromSats] = useState("");
  const [toSats, setToSats] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!fromSats || !toSats) {
      setErrorMsg("Both 'From' and 'To' IDs are required.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await deleteStudentsRange(fromSats, toSats);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg(result.success || "Students deleted successfully.");
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMsg("");
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete students");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-50 text-red-700 hover:bg-red-100 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2 border border-red-200"
      >
        <Trash2 className="w-4 h-4" /> Delete Students
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-black text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Delete Student Records
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                <p className="text-sm text-slate-600 font-medium">
                  <strong>Instruction:</strong> Enter the unique ID range of the students you want to delete. 
                  <br /><br />
                  <span className="text-indigo-600 font-bold">Single Student Deletion:</span> If you want to delete only <strong>one</strong> student, enter the <strong>same ID</strong> in both the "From" and "To" fields.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
                  ✓ {successMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    From ID
                  </label>
                  <input
                    type="text"
                    value={fromSats}
                    onChange={(e) => setFromSats(e.target.value)}
                    required
                    placeholder="e.g. STS-0001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    To ID
                  </label>
                  <input
                    type="text"
                    value={toSats}
                    onChange={(e) => setToSats(e.target.value)}
                    required
                    placeholder="e.g. STS-0010"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isLoading ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
