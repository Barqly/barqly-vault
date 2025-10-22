import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

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
 * EncryptionSummary - Post-encryption summary panel
 * Shows a summary of what was encrypted, styled like RecoveryInfoPanel
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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLocation = async () => {
    try {
      await navigator.clipboard.writeText(outputPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header with blue background like RecoveryInfoPanel */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 px-5 py-3 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-800">Encryption Summary</h3>
      </div>

      {/* Content with white background */}
      <div className="px-5 py-3 bg-white">
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
            <span className="text-slate-600">Location:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-700">{formatPath(outputPath)}</span>
              <button
                onClick={handleCopyLocation}
                className="p-1 rounded hover:bg-slate-100 transition-colors"
                title="Copy location"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptionSummary;
