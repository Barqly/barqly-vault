import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Copy, Check } from 'lucide-react';
import { DecryptionResult } from '../../bindings';

interface DecryptSuccessProps {
  result: DecryptionResult;
  onDecryptAnother?: () => void;
  isRecoveryMode?: boolean;
  vaultName?: string | null;
}

const DecryptSuccess: React.FC<DecryptSuccessProps> = ({
  result,
  onDecryptAnother,
  isRecoveryMode = false,
  vaultName = null,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);
  const decryptMoreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Hide confetti after 2 seconds
    const timer = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-focus the primary action button when success screen loads
  useEffect(() => {
    if (decryptMoreButtonRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      const timeoutId = setTimeout(() => {
        decryptMoreButtonRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, []);

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(result.output_dir);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  };

  const formatFileSize = (files: string[]): string => {
    // Calculate approximate size based on file count
    // This is a placeholder - you may want to get actual size from backend
    const avgFileSize = 450 * 1024; // Assume 450KB average per file
    const totalBytes = files.length * avgFileSize;

    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    if (totalBytes < 1024 * 1024 * 1024) return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatPath = (path: string): string => {
    if (path.startsWith('/Users/')) {
      return path.replace(/^\/Users\/[^/]+/, '~');
    }
    return path;
  };

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Minimal success animation - using teal for decrypt */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-teal-400 dark:bg-teal-500 rounded-full animate-bounce"
              style={{
                left: `${25 + i * 25}%`,
                top: '20px',
                animationDelay: `${i * 0.15}s`,
                animationDuration: '1.5s',
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      )}

      {/* Compact success header - matching encrypt page */}
      <div className="bg-white dark:bg-slate-800 px-6 py-4 text-center relative">
        <div className="relative z-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Vault decrypted successfully.
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Vault integrity verified - your files are authentic and unmodified
          </p>
        </div>
      </div>

      <div className="px-6 pt-6 pb-3">
        {/* Decryption Summary - matching EncryptionSummary style */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
          {/* Summary strip - simplified like encrypt page */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-500 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {result.extracted_files.length}{' '}
                  {result.extracted_files.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-500 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {formatFileSize(result.extracted_files)}
                </span>
              </div>
            </div>

            {/* Right-side badge */}
            <div className="flex items-center">
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400">Verified</span>
            </div>
          </div>

          {/* Save location section - matching encrypt page style */}
          <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Saved to:</span>
              </div>
              <button
                onClick={handleCopyPath}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Copy location"
                tabIndex={2}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" />
                )}
              </button>
            </div>
            <p className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-2 break-all bg-slate-50 dark:bg-slate-700 rounded px-2 py-1">
              {formatPath(result.output_dir)}
            </p>
          </div>
        </div>

        {/* Fixed action button at bottom - single button like encrypt page */}
        <div className="flex justify-center mt-6 bg-white dark:bg-slate-800 sticky bottom-0">
          {onDecryptAnother && (
            <button
              ref={decryptMoreButtonRef}
              onClick={onDecryptAnother}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500"
              tabIndex={1}
            >
              Decrypt More
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecryptSuccess;
