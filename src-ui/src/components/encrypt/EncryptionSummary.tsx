import React, { useState } from 'react';
import { Copy, Check, Lock, Share2 } from 'lucide-react';
import VaultOperationSummary from '../common/VaultOperationSummary';

interface EncryptionSummaryProps {
  vaultName: string;
  fileCount: number;
  totalSize: number;
  recipientCount: number;
  outputFileName: string;
  outputPath: string;
  sharedFilePath?: string; // Present when Recipients exist
  sharedFileName?: string;
  hasRecoveryItems: boolean;
}

/**
 * EncryptionSummary - Post-encryption summary panel
 * Shows dual files (backup + shared) when Recipients are present,
 * or single file (backup only) when no Recipients
 */
const EncryptionSummary: React.FC<EncryptionSummaryProps> = ({
  vaultName,
  fileCount,
  totalSize,
  recipientCount: _recipientCount,
  outputFileName,
  outputPath,
  sharedFilePath,
  sharedFileName,
  hasRecoveryItems: _hasRecoveryItems,
}) => {
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [copiedShared, setCopiedShared] = useState(false);

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

  const handleCopyPath = async (path: string, setterFn: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(path);
      setterFn(true);
      setTimeout(() => setterFn(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Dual output mode - show both backup and shared files
  if (sharedFilePath) {
    return (
      <div className="space-y-3">
        {/* Vault info header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-500/10 dark:to-blue-500/5 px-5 py-3 border-b border-slate-200 dark:border-slate-600">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Encryption Summary:
            </h3>
          </div>
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
            </div>
          </div>
        </div>

        {/* Backup bundle card - Blue accent */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-500/30 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-500/10 dark:to-blue-500/5 px-4 py-2 border-b border-blue-200 dark:border-blue-500/30 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Your Backup
            </span>
          </div>
          <div className="px-4 py-3 bg-white dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              For YOUR recovery. Keep this safe — it contains your private keys.
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {formatPath(outputPath)}
              </span>
              <button
                onClick={() => handleCopyPath(outputPath, setCopiedBackup)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                title="Copy path"
              >
                {copiedBackup ? (
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" />
                )}
              </button>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
              {outputFileName}
            </p>
          </div>
        </div>

        {/* Shared bundle card - Violet accent */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-violet-200 dark:border-violet-500/30 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-violet-50/50 dark:from-violet-500/10 dark:to-violet-500/5 px-4 py-2 border-b border-violet-200 dark:border-violet-500/30 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">
              Share with Recipients
            </span>
          </div>
          <div className="px-4 py-3 bg-white dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Safe to send to recipients. Contains only files — no private keys.
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                {formatPath(sharedFilePath)}
              </span>
              <button
                onClick={() => handleCopyPath(sharedFilePath, setCopiedShared)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                title="Copy path"
              >
                {copiedShared ? (
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" />
                )}
              </button>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
              {sharedFileName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Single output mode - existing behavior (no Recipients)
  return (
    <VaultOperationSummary
      title="Encryption Summary:"
      vaultName={vaultName}
      fileCount={fileCount}
      totalSize={totalSize}
      outputPath={outputPath}
    />
  );
};

export default EncryptionSummary;
