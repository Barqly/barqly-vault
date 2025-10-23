import React, { useState, useEffect, useRef } from 'react';
import { DecryptionResult } from '../../bindings';
import VaultOperationSummary from '../common/VaultOperationSummary';

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

  // Calculate approximate size for decrypted files
  const calculateTotalSize = (files: string[]): number => {
    const avgFileSize = 450 * 1024; // Assume 450KB average per file
    return files.length * avgFileSize;
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
        {/* Decryption Summary - using shared component */}
        <VaultOperationSummary
          title="Decryption Summary:"
          vaultName={vaultName || 'Unknown Vault'}
          fileCount={result.extracted_files.length}
          totalSize={calculateTotalSize(result.extracted_files)}
          outputPath={result.output_dir}
        />

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
