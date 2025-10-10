import React, { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { logger } from '../../lib/logger';

interface KeyImportDialogProps {
  onImport: (filePath: string) => Promise<void>;
  onClose: () => void;
}

export const KeyImportDialog: React.FC<KeyImportDialogProps> = ({
  onImport,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Encrypted Key Files',
          extensions: ['enc']
        }],
        title: 'Select Encrypted Key File'
      });

      if (selected) {
        setSelectedFile(selected as string);
        setError(null);
      }
    } catch (err) {
      logger.error('KeyImportDialog', 'Failed to select file', err as Error);
      setError('Failed to select file');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      await onImport(selectedFile);
      onClose();
    } catch (err) {
      logger.error('KeyImportDialog', 'Import failed', err as Error);
      setError((err as Error).message || 'Failed to import key');
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, onImport, onClose]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Import Encrypted Key</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      {/* File Drop Zone */}
      <div
        className={`
          relative rounded-lg border-2 border-dashed p-8
          transition-colors cursor-pointer
          ${dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
        `}
        onClick={handleFileSelect}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          // Note: Tauri doesn't support drag & drop file paths directly
          // This would need additional implementation
        }}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <Upload className="h-10 w-10 text-slate-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              Click to select .enc file
            </p>
            <p className="text-xs text-slate-500 mt-1">
              or drag and drop
            </p>
          </div>
        </div>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm text-slate-700 truncate">
            {selectedFile.split('/').pop() || selectedFile}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="
            flex-1 px-4 py-2 text-sm font-medium text-slate-600
            border border-slate-200 rounded-lg
            hover:bg-slate-50 transition-colors
          "
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={!selectedFile || isImporting}
          className="
            flex-1 px-4 py-2 text-sm font-medium
            border rounded-lg transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            text-white bg-blue-600 border-blue-600
            hover:bg-blue-700 hover:border-blue-700
          "
        >
          {isImporting ? 'Importing...' : 'Import Key'}
        </button>
      </div>
    </div>
  );
};