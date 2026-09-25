'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, File, AlertCircle } from 'lucide-react';
import { getImportBatches, deleteImportBatch } from '@/app/actions/student-actions';

interface ImportBatch {
  id: string;
  fileName: string;
  importedAt: Date;
  studentCount: number;
  classAdmittedTo: string;
}

/**
 * File Management Panel
 * Displays all imported Excel/PDF files in a white box (like Recent Activity)
 * Allows clerks to delete accidentally imported files with confirmation
 */
export default function FileManagementPanel() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const result = await getImportBatches();
        console.log("FileManagementPanel - result:", result);
        if (result.error) {
          setError(result.error);
          setBatches([]);
        } else {
          // Convert dates if they're strings
          const formattedBatches = (result.batches || []).map((batch: any) => ({
            ...batch,
            importedAt: typeof batch.importedAt === 'string' 
              ? new Date(batch.importedAt)
              : batch.importedAt
          }));
          setBatches(formattedBatches);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch import batches:', err);
        setError('Failed to load import batches');
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  const handleDelete = async (batchId: string) => {
    try {
      setDeletingId(batchId);
      const result = await deleteImportBatch(batchId);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Remove deleted batch from list
        setBatches(batches.filter(b => b.id !== batchId));
        setError(null);
      }
    } catch (err) {
      console.error('Failed to delete import batch:', err);
      setError('Failed to delete import batch');
    } finally {
      setDeletingId(null);
      setShowConfirm(null);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📁 Imported Files</h3>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📁 Imported Files</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {batches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <File className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No files imported yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <div className="flex items-center gap-3 flex-1">
                <File className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {batch.fileName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {batch.classAdmittedTo} • {formatDate(batch.importedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {batch.studentCount} students
                </span>

                {showConfirm === batch.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(batch.id)}
                      disabled={deletingId === batch.id}
                      className="text-xs font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-2 py-1 rounded transition-colors"
                    >
                      {deletingId === batch.id ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowConfirm(null)}
                      disabled={deletingId === batch.id}
                      className="text-xs font-medium bg-gray-300 hover:bg-gray-400 disabled:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirm(batch.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                    title="Delete this file and all associated students"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Deleting a file removes all {batches.length > 0 ? 'imported' : ''} students from this batch permanently.</p>
      </div>
    </div>
  );
}
