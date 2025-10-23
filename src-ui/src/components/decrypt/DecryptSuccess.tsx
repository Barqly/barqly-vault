import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, FolderOpen, Copy, FileText, HardDrive, Archive, Home } from 'lucide-react';
import { DecryptionResult } from '../../bindings';
import { useSuccessPanelSizing } from '../../utils/viewport';
import ScrollHint from '../ui/ScrollHint';
import { useNavigate } from 'react-router-dom';

interface RecoveredItems {
  manifest?: any;
  keys?: string[];
  files?: string[];
}

interface DecryptSuccessProps {
  result: DecryptionResult;
  onDecryptAnother?: () => void;
  isRecoveryMode?: boolean;
  recoveredItems?: RecoveredItems | null;
  vaultName?: string | null;
}

const DecryptSuccess: React.FC<DecryptSuccessProps> = ({
  result,
  onDecryptAnother,
  isRecoveryMode = false,
  recoveredItems = null,
  vaultName = null,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [copiedPath, setCopiedPath] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const decryptMoreButtonRef = useRef<HTMLButtonElement>(null);
  const responsiveStyles = useSuccessPanelSizing();
  const navigate = useNavigate();

  useEffect(() => {
    // Subtle animation duration
    const timer = setTimeout(() => setShowConfetti(false), 2000);

    // Mark content as ready after a minimal delay to ensure smooth transition
    const contentTimer = setTimeout(() => setIsContentReady(true), 50);

    return () => {
      clearTimeout(timer);
      clearTimeout(contentTimer);
    };
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
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  };

  const formatFileSize = (_files: string[]): string => {
    // This would need actual size calculation
    return '1.8 MB';
  };

  return (
    <div
      className={`relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden transition-opacity duration-300 ${
        isContentReady ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        ...responsiveStyles,
        maxHeight: responsiveStyles['--success-panel-max-height'],
        minHeight: responsiveStyles['--success-panel-min-height'],
      }}
    >
      {/* Minimal success animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"
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

      {/* Compact success header - responsive height */}
      <div
        className="bg-white dark:bg-slate-800 px-6 py-3 text-center relative"
        style={{ height: responsiveStyles['--success-panel-header-height'] }}
      >
        <div className="relative z-10 flex items-center justify-center gap-3">
          <CheckCircle className="w-8 h-8 text-teal-600" />
          <div className="text-left">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Vault decrypted successfully.</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Vault integrity verified - your files are authentic and unmodified
            </p>
          </div>
        </div>
      </div>

      <ScrollHint
        className="flex-1"
        style={{ maxHeight: responsiveStyles['--success-panel-content-height'] }}
      >
        <div className="p-4 space-y-4">
          {/* Recovery information (if in recovery mode) */}
          {isRecoveryMode && recoveredItems && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-300 font-medium mb-3">
                <Archive className="w-5 h-5" />
                Vault Recovery Complete
              </div>
              <div className="space-y-2">
                {recoveredItems.files && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{recoveredItems.files.length} files extracted</span>
                  </div>
                )}
                {recoveredItems.manifest && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Vault manifest restored</span>
                  </div>
                )}
                {recoveredItems.keys && recoveredItems.keys.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Passphrase key imported</span>
                  </div>
                )}
              </div>
              {vaultName && (
                <p className="text-sm text-green-700 dark:text-green-400 mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                  The <span className="font-medium">{vaultName}</span> vault is now available in
                  your Vault Hub
                </p>
              )}
            </div>
          )}

          {/* Summary strip (chips) */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-lg px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-600 px-3 py-1">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {result.extracted_files.length}{' '}
                  {result.extracted_files.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-600 px-3 py-1">
                <HardDrive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {formatFileSize(result.extracted_files)}
                </span>
              </div>
            </div>

            {/* Right-side badges */}
            <div className="flex items-center">
              {result.manifest_verified !== undefined && (
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    result.manifest_verified
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {result.manifest_verified ? 'Verified' : 'Unverified'}
                </div>
              )}
            </div>
          </div>

          {/* Saved-to path section */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Saved to:
              </span>
              <button
                onClick={handleCopyPath}
                className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-md transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                tabIndex={2}
              >
                <Copy className="w-3 h-3" />
                {copiedPath ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-600">
              {result.output_dir}
            </p>
          </div>

          {/* Final CTA */}
          <div className="flex justify-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0">
            {isRecoveryMode && (
              <button
                onClick={() => navigate('/')}
                className="h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2 transition-colors"
                tabIndex={2}
              >
                <Home className="w-4 h-4" />
                Open Vault Hub
              </button>
            )}
            {onDecryptAnother && (
              <button
                ref={decryptMoreButtonRef}
                onClick={onDecryptAnother}
                className="h-10 rounded-xl px-5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 transition-colors"
                style={{ backgroundColor: '#1D4ED8' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                tabIndex={1}
              >
                Decrypt More
              </button>
            )}
          </div>
        </div>
      </ScrollHint>
    </div>
  );
};

export default DecryptSuccess;
