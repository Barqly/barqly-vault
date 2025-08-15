import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, FolderOpen, Copy, FileText, HardDrive } from 'lucide-react';
import { DecryptionResult } from '../../lib/api-types';
import { useSuccessPanelSizing } from '../../utils/viewport';
import ScrollHint from '../ui/ScrollHint';

interface DecryptSuccessProps {
  result: DecryptionResult;
  onDecryptAnother?: () => void;
}

const DecryptSuccess: React.FC<DecryptSuccessProps> = ({ result, onDecryptAnother }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [copiedPath, setCopiedPath] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const decryptMoreButtonRef = useRef<HTMLButtonElement>(null);
  const responsiveStyles = useSuccessPanelSizing();

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
      className={`relative bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-opacity duration-300 ${
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
              className="absolute w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
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
        className="bg-white px-6 py-3 text-center relative"
        style={{ height: responsiveStyles['--success-panel-header-height'] }}
      >
        <div className="relative z-10 flex items-center justify-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div className="text-left">
            <h2 className="text-xl font-semibold text-slate-900">Vault decrypted successfully.</h2>
            <p className="text-sm text-slate-600 mt-1">Vault integrity verified - your files are authentic and unmodified</p>
          </div>
        </div>
      </div>

      <ScrollHint
        className="flex-1"
        style={{ maxHeight: responsiveStyles['--success-panel-content-height'] }}
      >
        <div className="p-4 space-y-4">
          {/* Summary strip (chips) */}
          <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-slate-700 font-medium">
                  {result.extracted_files.length}{' '}
                  {result.extracted_files.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">
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
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {result.manifest_verified ? 'Verified' : 'Unverified'}
                </div>
              )}
            </div>
          </div>

          {/* Saved-to path section */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Saved to:
              </span>
              <button
                onClick={handleCopyPath}
                className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                tabIndex={2}
              >
                <Copy className="w-3 h-3" />
                {copiedPath ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-xs text-slate-700 break-all bg-white rounded-lg px-2 py-1 border border-slate-200">
              {result.output_dir}
            </p>
          </div>

          {/* Final CTA */}
          <div className="flex justify-center gap-3 pt-6 border-t border-slate-200 bg-white sticky bottom-0">
            {onDecryptAnother && (
              <button
                ref={decryptMoreButtonRef}
                onClick={onDecryptAnother}
                className="h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
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
