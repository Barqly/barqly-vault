import React from 'react';
import { FileText, Users, CheckCircle, Folder } from 'lucide-react';

interface EncryptionSummaryProps {
  vaultName: string;
  fileCount: number;
  totalSize: number;
  recipientCount: number;
  outputFileName: string;
  outputPath: string;
  hasRecoveryItems: boolean;
}

/**
 * EncryptionSummary - Pre-encryption review panel
 * Shows a summary of what will be encrypted before the user confirms
 */
const EncryptionSummary: React.FC<EncryptionSummaryProps> = ({
  vaultName,
  fileCount,
  totalSize,
  recipientCount,
  outputFileName,
  outputPath,
  hasRecoveryItems,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatPath = (path: string): string => {
    if (path.startsWith('/Users/')) {
      return path.replace(/^\/Users\/[^/]+/, '~');
    }
    return path;
  };

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-800">Encryption Summary</h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Vault:</span>
          <span className="font-medium text-slate-800">{vaultName}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Files:</span>
          <span className="font-medium text-slate-800">
            {fileCount} {fileCount === 1 ? 'item' : 'items'} ({formatFileSize(totalSize)})
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Recipients:</span>
          <span className="font-medium text-slate-800">
            {recipientCount} {recipientCount === 1 ? 'key' : 'keys'}
          </span>
        </div>

        {hasRecoveryItems && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Recovery:</span>
            <span className="font-medium text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Fully included
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 mt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Output:</span>
            <span className="font-mono text-xs text-slate-800">{outputFileName}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-slate-600">Location:</span>
            <span className="font-mono text-xs text-slate-700">{formatPath(outputPath)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptionSummary;
