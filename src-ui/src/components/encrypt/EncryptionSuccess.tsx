import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  Copy,
  FolderOpen,
  BookOpen,
  RotateCcw,
  HardDrive,
  Unlock,
} from 'lucide-react';
import { useSuccessPanelSizing } from '../../utils/viewport';
import ScrollHint from '../ui/ScrollHint';

interface EncryptionSuccessProps {
  outputPath: string;
  fileName: string;
  fileCount: number;
  encryptedSize: number;
  recoveryItemsIncluded?: string[]; // New prop for recovery items
  onEncryptMore: () => void;
  onNavigateToDecrypt?: () => void;
  onViewGuide?: () => void;
}

const EncryptionSuccess: React.FC<EncryptionSuccessProps> = ({
  outputPath,
  fileName,
  fileCount,
  encryptedSize,
  recoveryItemsIncluded,
  onEncryptMore,
  onNavigateToDecrypt,
  onViewGuide,
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const primaryActionButtonRef = useRef<HTMLButtonElement>(null);
  const responsiveStyles = useSuccessPanelSizing();

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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCopyPath = async () => {
    try {
      const fullPath = `${outputPath}/${fileName}`;
      // Use the navigator.clipboard API
      await navigator.clipboard.writeText(fullPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  };

  return (
    <div
      className="relative bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
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
            <h2 className="text-xl font-semibold text-slate-900">
              Your vault is ready — securely encrypted.
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Encryption verified — your vault is securely protected and ready for storage or
              sharing
            </p>
          </div>
        </div>
      </div>

      <ScrollHint
        className="flex-1"
        style={{ maxHeight: responsiveStyles['--success-panel-content-height'] }}
      >
        <div className="p-4 space-y-4">
          {/* Inline stats - horizontal layout saves vertical space */}
          <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-900">
                  {fileCount} {fileCount === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">{formatFileSize(encryptedSize)}</span>
              </div>
            </div>
          </div>

          {/* Vault Location - more compact */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Vault Files Created:
              </span>
              <button
                onClick={handleCopyPath}
                className="px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                tabIndex={2}
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs text-slate-800 break-all bg-white rounded px-2 py-1 border border-slate-200">
                {outputPath}/{fileName}
              </p>
              <p className="font-mono text-xs text-slate-600 break-all bg-white rounded px-2 py-1 border border-slate-200">
                {outputPath}/{fileName.replace('.age', '.manifest')}
              </p>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              External manifest provides readable vault contents for verification
            </p>
          </div>

          {/* Recovery Items Included - new section */}
          {recoveryItemsIncluded && recoveryItemsIncluded.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Recovery items included:</span>
              </div>
              <ul className="space-y-1 ml-6">
                {recoveryItemsIncluded.map((item, index) => (
                  <li key={index} className="text-xs text-green-700 flex items-center gap-1">
                    <span className="text-green-600">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fixed action buttons at bottom */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200 bg-white sticky bottom-0">
            <button
              onClick={onEncryptMore}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
              tabIndex={2}
            >
              <RotateCcw className="w-4 h-4" />
              Encrypt More
            </button>
            {onNavigateToDecrypt ? (
              <button
                ref={primaryActionButtonRef}
                onClick={onNavigateToDecrypt}
                className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                tabIndex={1}
              >
                <Unlock className="w-4 h-4" />
                Decrypt Your Vault
              </button>
            ) : (
              onViewGuide && (
                <button
                  ref={primaryActionButtonRef}
                  onClick={onViewGuide}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                  tabIndex={1}
                >
                  <BookOpen className="w-4 h-4" />
                  View Decryption Guide
                </button>
              )
            )}
          </div>
        </div>
      </ScrollHint>
    </div>
  );
};

export default EncryptionSuccess;
