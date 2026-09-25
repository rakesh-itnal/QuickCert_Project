"use client"

import { useState, useCallback } from "react";
import { Edit2, Save, X, AlertCircle, Check } from "lucide-react";
import { editStudent, findSimilarValues } from "@/app/actions/student-actions";

interface StudentEditModalProps {
  student: any;
  instituteId?: string;
}

interface FieldSuggestion {
  field: string;
  value: string;
  suggestions: Array<{ value: string; count: number; similarity: number }>;
}

export default function StudentEditModal({ student, instituteId }: StudentEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: student.name || "",
    fatherName: student.fatherName || "",
    motherName: student.motherName || "",
    gender: student.gender || "",
    caste: student.caste || "",
    stream: student.stream || "",
    substream: student.substream || "",
    classAdmittedTo: student.classAdmittedTo || "",
    dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : "",
    academicYearJoined: student.academicYearJoined || "",
    academicYearLeft: student.academicYearLeft || "",
  });

  const [suggestions, setSuggestions] = useState<FieldSuggestion | null>(null);
  const [suggestedValues, setSuggestedValues] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);

    // Debounce similarity search (0.8 seconds)
    const fieldsToCheck = ["gender", "caste", "stream", "substream", "classAdmittedTo"];
    if (fieldsToCheck.includes(name) && value.length > 2 && instituteId) {
      const timeout = setTimeout(async () => {
        try {
          const result = await findSimilarValues(instituteId, name, value);
          if (result.suggestions && result.suggestions.length > 0) {
            setSuggestions({
              field: name,
              value: value,
              suggestions: result.suggestions.filter((s: any) => s.value !== value)
            });
          } else {
            setSuggestions(null);
          }
        } catch (err) {
          console.log("No suggestions found");
        }
      }, 800);
      setSearchTimeout(timeout);
    } else {
      setSuggestions(null);
    }
  };

  const acceptSuggestion = (suggestedValue: string, fieldName: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: suggestedValue }));
    setSuggestedValues(prev => ({ ...prev, [fieldName]: suggestedValue }));
    setSuggestions(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const updateData: any = { ...formData };
      if (updateData.dob && updateData.dob.length > 0) {
        updateData.dob = new Date(updateData.dob);
      } else {
        updateData.dob = null;
      }

      const result = await editStudent(student.id, updateData);

      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg(result.success || "Student updated successfully!");
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMsg("");
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update student");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
      >
        <Edit2 className="w-3 h-3" /> Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">
                Edit Student: {student.name}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Error and Success Messages */}
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

              {/* Grid Layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1 */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Student Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Father Name
                  </label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Row 2 */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Mother Name
                  </label>
                  <input
                    type="text"
                    name="motherName"
                    value={formData.motherName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Row 3 */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Caste
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="caste"
                      value={formData.caste}
                      onChange={handleChange}
                      placeholder="e.g. General, SC, ST, OBC"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {suggestions?.field === "caste" && suggestions?.suggestions?.length > 0 && (
                      <SuggestionBox
                        suggestions={suggestions.suggestions}
                        onAccept={(val) => acceptSuggestion(val, "caste")}
                      />
                    )}
                  </div>
                </div>

                {/* Row 4 */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Stream (Text Format)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="stream"
                      value={formData.stream}
                      onChange={handleChange}
                      placeholder="e.g. Science, Commerce, Arts"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {suggestions?.field === "stream" && suggestions?.suggestions?.length > 0 && (
                      <SuggestionBox
                        suggestions={suggestions.suggestions}
                        onAccept={(val) => acceptSuggestion(val, "stream")}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Substream (Text Format)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="substream"
                      value={formData.substream}
                      onChange={handleChange}
                      placeholder="e.g. PCMB, PCM, PCB, Business, Geography"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {suggestions?.field === "substream" && suggestions?.suggestions?.length > 0 && (
                      <SuggestionBox
                        suggestions={suggestions.suggestions}
                        onAccept={(val) => acceptSuggestion(val, "substream")}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Class Admitted To
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="classAdmittedTo"
                      value={formData.classAdmittedTo}
                      onChange={handleChange}
                      placeholder="e.g. 1st PUC, 2nd PUC"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {suggestions?.field === "classAdmittedTo" && suggestions?.suggestions?.length > 0 && (
                      <SuggestionBox
                        suggestions={suggestions.suggestions}
                        onAccept={(val) => acceptSuggestion(val, "classAdmittedTo")}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Academic Year Joined
                  </label>
                  <input
                    type="text"
                    name="academicYearJoined"
                    value={formData.academicYearJoined}
                    onChange={handleChange}
                    placeholder="e.g. 2021-2022"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Academic Year Left
                  </label>
                  <input
                    type="text"
                    name="academicYearLeft"
                    value={formData.academicYearLeft}
                    onChange={handleChange}
                    placeholder="e.g. 2023-2024"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-slate-200">
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Suggestion Box Component
 * Shows "Did you mean?" suggestions for standardized data
 */
function SuggestionBox({ suggestions, onAccept }: { 
  suggestions: Array<{ value: string; count: number; similarity: number }>,
  onAccept: (value: string) => void
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-blue-200 rounded-lg shadow-lg p-3 z-10 bg-blue-50">
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs font-bold text-blue-700">
          Found similar data in system. Do you want to standardize?
        </p>
      </div>
      <div className="space-y-2">
        {suggestions.map((sugg, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onAccept(sugg.value)}
            className="w-full text-left p-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-between text-sm"
          >
            <div>
              <div className="font-bold text-slate-800">{sugg.value}</div>
              <div className="text-xs text-slate-500">
                Used by {sugg.count} other student{sugg.count !== 1 ? "s" : ""}
              </div>
            </div>
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
