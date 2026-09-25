"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, CheckCircle } from "lucide-react";

interface StudentSelectProps {
  students: any[];
  selectedStudentId: string;
  onSelect: (studentId: string, studentName: string) => void;
}

export default function SearchableStudentSelect({
  students,
  selectedStudentId,
  onSelect,
}: StudentSelectProps) {
  const [searchInput, setSearchInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected student info
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Filter students based on search input
  useEffect(() => {
    if (searchInput.trim() === "") {
      setFilteredStudents([]);
      setIsOpen(false);
      return;
    }

    const searchLower = searchInput.toLowerCase();
    const filtered = students.filter((st) => {
      const nameMatch = st.name?.toLowerCase().includes(searchLower);
      const satsMatch = st.satsNumber?.toString().includes(searchInput);
      const classMatch = st.classAdmittedTo?.toLowerCase().includes(searchLower);
      return nameMatch || satsMatch || classMatch;
    });

    setFilteredStudents(filtered);
    setHighlightedIndex(-1);
    setIsOpen(filtered.length > 0);
  }, [searchInput, students]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredStudents.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          selectStudent(filteredStudents[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchInput("");
        break;
      default:
        break;
    }
  };

  const selectStudent = (student: any) => {
    onSelect(student.id, student.name);
    setSearchInput("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={
            selectedStudent
              ? `${selectedStudent.name} (${selectedStudent.satsNumber})`
              : "Type student name or SATS ID..."
          }
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => {
            if (searchInput.trim() !== "") {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
        />
        {selectedStudent && !searchInput && (
          <button
            type="button"
            onClick={() => {
              onSelect("", "");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && filteredStudents.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {filteredStudents.map((student, index) => (
            <button
              key={student.id}
              type="button"
              onClick={() => selectStudent(student)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 flex items-center justify-between transition-colors ${
                highlightedIndex === index
                  ? "bg-emerald-50"
                  : "bg-white hover:bg-slate-50"
              } ${selectedStudentId === student.id ? "bg-emerald-50" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{student.name}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="font-mono">ID: {student.satsNumber || "N/A"}</span>
                  {student.classAdmittedTo && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                      {student.classAdmittedTo}
                    </span>
                  )}
                </p>
              </div>
              {selectedStudentId === student.id && (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && searchInput && filteredStudents.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center z-50">
          <p className="text-slate-500 text-sm font-medium">
            No students found matching "{searchInput}"
          </p>
        </div>
      )}

      {/* Selected Student Badge (when not searching) */}
      {selectedStudent && !searchInput && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-700">{selectedStudent.name}</p>
            <p className="text-xs text-emerald-600">
              {selectedStudent.satsNumber} • {selectedStudent.classAdmittedTo}
            </p>
          </div>
          <CheckCircle className="w-5 h-5 text-emerald-600" />
        </div>
      )}
    </div>
  );
}
