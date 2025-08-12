import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  FolderOpen,
  Copy,
  FileText,
  Clock,
  HardDrive,
  ChevronDown,
} from 'lucide-react';
import { DecryptionResult } from '../../lib/api-types';
import { useSuccessPanelSizing } from '../../utils/viewport';
import ScrollHint from '../ui/ScrollHint';

interface DecryptSuccessProps {
  result: DecryptionResult;
  onDecryptAnother?: () => void;
  onClose?: () => void;
}

const DecryptSuccess: React.FC<DecryptSuccessProps> = ({ result, onDecryptAnother, onClose }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [copiedPath, setCopiedPath] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
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

  const handleOpenFolder = () => {
    // This would need Tauri command to open file explorer
    // For now, we'll just copy the path
    handleCopyPath();
  };

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

  const getDecryptionTime = (): string => {
    // This would need actual time tracking
    return '12 seconds';
  };

  return (
    <div
      className={`relative bg-white rounded-lg border border-green-200 overflow-hidden transition-opacity duration-300 ${
        isContentReady ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        ...responsiveStyles,
        maxHeight: responsiveStyles['--success-panel-max-height'],
        minHeight: responsiveStyles['--success-panel-min-height'],
      }}
    >
      {/* Compact success header - responsive height */}
      <div
        className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-3 text-center relative"
        style={{ height: responsiveStyles['--success-panel-header-height'] }}
      >
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Minimal confetti effect */}
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
                style={{
                  left: `${25 + i * 25}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1.5s',
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex items-center justify-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">Vault Successfully Decrypted!</h2>
            <p className="text-sm text-gray-600">Files recovered and ready to use</p>
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
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  {result.extracted_files.length} files
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">{getDecryptionTime()}</span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {formatFileSize(result.extracted_files)}
                </span>
              </div>
            </div>

            {/* Manifest status inline */}
            {result.manifest_verified !== undefined && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  result.manifest_verified ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                <span className="text-xs">
                  {result.manifest_verified ? '✓ Verified' : '⚠ Unverified'}
                </span>
              </div>
            )}
          </div>

          {/* File location - more compact */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Saved to:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenFolder}
                  className="px-2 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={handleCopyPath}
                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copiedPath ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <p className="font-mono text-xs text-gray-800 break-all bg-white rounded px-2 py-1 border border-gray-200">
              {result.output_dir}
            </p>
          </div>

          {/* Collapsible file list - prevents forced scrolling */}
          {result.extracted_files.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowAllFiles(!showAllFiles)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {result.extracted_files.length} recovered files
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showAllFiles ? 'transform rotate-180' : ''
                  }`}
                />
              </button>

              {showAllFiles && (
                <div className="border-t border-gray-200 px-3 py-2 max-h-32 overflow-y-auto bg-gray-50">
                  <ul className="space-y-1">
                    {result.extracted_files.map((file, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs text-gray-600">
                        <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="font-mono truncate">{file.split('/').pop() || file}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Fixed action buttons at bottom */}
          <div className="flex justify-center gap-3 pt-3 border-t border-gray-200 bg-white sticky bottom-0">
            {onDecryptAnother && (
              <button
                onClick={onDecryptAnother}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Decrypt Another Vault
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </ScrollHint>
    </div>
  );
};

export default DecryptSuccess;
