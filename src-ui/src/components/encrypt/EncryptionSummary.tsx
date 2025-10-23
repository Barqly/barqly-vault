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
  recipientCount: _recipientCount,
  outputFileName: _outputFileName,
  outputPath,
  hasRecoveryItems: _hasRecoveryItems,
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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
      {/* Header with blue background like RecoveryInfoPanel */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-500/10 dark:to-blue-500/5 px-5 py-3 border-b border-slate-200 dark:border-slate-600">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Encryption Summary:
        </h3>
      </div>

      {/* Content with white background */}
      <div className="px-5 py-3 bg-white dark:bg-slate-800">
        <div className="space-y-2" style={{ marginLeft: '180px' }}>
          <div className="flex items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400" style={{ width: '100px' }}>
              Vault:
            </span>
            <span className="text-slate-800 dark:text-slate-200">{vaultName}</span>
          </div>

          <div className="flex items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400" style={{ width: '100px' }}>
              Files:
            </span>
            <span className="text-slate-800 dark:text-slate-200">
              {fileCount} {fileCount === 1 ? 'item' : 'items'} ({formatFileSize(totalSize)})
            </span>
          </div>

          <div className="flex items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400" style={{ width: '100px' }}>
              Location:
            </span>
            <div className="flex items-center gap-2 flex-1">
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                {formatPath(outputPath)}
              </span>
              <button
                onClick={handleCopyLocation}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Copy location"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" />
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
