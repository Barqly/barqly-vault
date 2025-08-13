import React, { useState, useEffect } from 'react';
import { CheckCircle, Copy, FolderOpen, BookOpen, RotateCcw, Clock, HardDrive } from 'lucide-react';
import { useSuccessPanelSizing } from '../../utils/viewport';
import ScrollHint from '../ui/ScrollHint';

interface EncryptionSuccessProps {
  outputPath: string;
  fileName: string;
  fileCount: number;
  encryptedSize: number;
  duration: number;
  onEncryptMore: () => void;
  onViewGuide?: () => void;
}

const EncryptionSuccess: React.FC<EncryptionSuccessProps> = ({
  outputPath,
  fileName,
  fileCount,
  encryptedSize,
  duration,
  onEncryptMore,
  onViewGuide,
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const responsiveStyles = useSuccessPanelSizing();

  useEffect(() => {
    // Hide confetti after 2 seconds
    const timer = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(timer);
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
      className="relative bg-white rounded-lg shadow-lg border border-green-200 overflow-hidden"
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
        className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-3 text-center relative"
        style={{ height: responsiveStyles['--success-panel-header-height'] }}
      >
        <div className="relative z-10 flex items-center justify-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">Vault Successfully Created!</h2>
            <p className="text-sm text-gray-600">Military-grade encryption applied</p>
          </div>
        </div>
      </div>

      <ScrollHint
        className="flex-1"
        style={{ maxHeight: responsiveStyles['--success-panel-content-height'] }}
      >
        <div className="p-4 space-y-4">
          {/* Inline stats - horizontal layout saves vertical space */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  {fileCount} {fileCount === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">{duration}s</span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{formatFileSize(encryptedSize)}</span>
              </div>
            </div>
          </div>

          {/* Vault Location - more compact */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Vault Location:
              </span>
              <button
                onClick={handleCopyPath}
                className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-xs text-gray-800 break-all bg-white rounded px-2 py-1 border border-gray-200">
              {outputPath}/{fileName}
            </p>
          </div>

          {/* Fixed action buttons at bottom */}
          <div className="flex justify-center gap-3 pt-3 border-t border-gray-200 bg-white sticky bottom-0">
            <button
              onClick={onEncryptMore}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Encrypt More
            </button>
            {onViewGuide && (
              <button
                onClick={onViewGuide}
                className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                View Decryption Guide
              </button>
            )}
          </div>
        </div>
      </ScrollHint>
    </div>
  );
};

export default EncryptionSuccess;
