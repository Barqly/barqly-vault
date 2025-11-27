import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Unlock } from 'lucide-react';
import EncryptionSummary from './EncryptionSummary';

interface EncryptionSuccessProps {
  outputPath: string;
  fileName: string;
  sharedFilePath?: string; // Present when Recipients exist - for sharing
  sharedFileName?: string; // Derived from sharedFilePath
  fileCount: number;
  originalSize: number;
  encryptedSize: number;
  vaultName: string;
  recipientCount: number;
  archiveName?: string | null;
  recoveryItemsIncluded?: string[];
  onEncryptMore: () => void;
  onNavigateToDecrypt?: () => void;
}

const EncryptionSuccess: React.FC<EncryptionSuccessProps> = ({
  outputPath,
  fileName,
  sharedFilePath,
  sharedFileName,
  fileCount,
  originalSize,
  encryptedSize: _encryptedSize,
  vaultName,
  recipientCount,
  archiveName,
  recoveryItemsIncluded: _recoveryItemsIncluded,
  onEncryptMore,
  onNavigateToDecrypt,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const primaryActionButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Hide confetti after 2 seconds
    const timer = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-focus the primary action button when success screen loads
  useEffect(() => {
    if (primaryActionButtonRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      const timeoutId = setTimeout(() => {
        primaryActionButtonRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, []);

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Minimal success animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-green-400 dark:bg-green-500 rounded-full animate-bounce"
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

      {/* Compact success header */}
      <div className="bg-white dark:bg-slate-800 px-6 py-4 text-center relative">
        <div className="relative z-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Your vault is ready — securely encrypted.
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Encryption verified — your vault is securely protected and ready for storage or sharing
          </p>
        </div>
      </div>

      <div className="px-6 pt-6 pb-3">
        {/* Encryption Summary - shows what was encrypted */}
        <EncryptionSummary
          vaultName={vaultName}
          fileCount={fileCount}
          totalSize={originalSize}
          recipientCount={recipientCount}
          outputFileName={archiveName ? `${archiveName}.age` : fileName}
          outputPath={outputPath}
          sharedFilePath={sharedFilePath}
          sharedFileName={sharedFileName}
          hasRecoveryItems={true}
        />

        {/* Fixed action buttons at bottom */}
        <div className="flex justify-between items-center mt-6 bg-white dark:bg-slate-800 sticky bottom-0 gap-3">
          {/* Left: Encrypt More (ghost style) */}
          <button
            onClick={onEncryptMore}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500"
            tabIndex={2}
          >
            <RotateCcw className="w-4 h-4" />
            Encrypt More
          </button>

          {/* Right: Decrypt (premium blue - stays the same in dark mode) */}
          <button
            ref={primaryActionButtonRef}
            onClick={
              onNavigateToDecrypt || (() => console.warn('No decrypt navigation handler provided'))
            }
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500"
            tabIndex={1}
          >
            <Unlock className="w-4 h-4" />
            Decrypt
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncryptionSuccess;
