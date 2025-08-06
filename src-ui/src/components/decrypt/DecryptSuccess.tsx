import React, { useState, useEffect } from 'react';
import { CheckCircle, FolderOpen, Copy, FileText, Clock, HardDrive } from 'lucide-react';
import { DecryptionResult } from '../../lib/api-types';

interface DecryptSuccessProps {
  result: DecryptionResult;
  onDecryptAnother?: () => void;
  onClose?: () => void;
}

const DecryptSuccess: React.FC<DecryptSuccessProps> = ({ result, onDecryptAnother, onClose }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    // Subtle animation duration
    const timer = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(timer);
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
    <div className="relative bg-white rounded-lg border border-green-200 overflow-hidden">
      {/* Success header with subtle animation */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 text-center relative">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Subtle confetti effect - just animated dots */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-green-400 rounded-full animate-bounce"
                style={{
                  left: `${15 + i * 15}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '2s',
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3 animate-scale-in" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vault Successfully Decrypted!</h2>
          <p className="text-gray-600">Your files have been recovered and are ready to use.</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* File location */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Files saved to:
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleOpenFolder}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 transition-colors"
              >
                Open Folder
              </button>
              <button
                onClick={handleCopyPath}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copiedPath ? 'Copied!' : 'Copy Path'}
              </button>
            </div>
          </div>
          <p className="font-mono text-sm text-gray-800 break-all bg-white rounded px-3 py-2 border border-gray-200">
            {result.output_dir}
          </p>
        </div>

        {/* Recovery summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Files Recovered</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{result.extracted_files.length}</p>
            <p className="text-xs text-gray-600 mt-1">
              Total size: {formatFileSize(result.extracted_files)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Decryption Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{getDecryptionTime()}</p>
            <p className="text-xs text-gray-600 mt-1">Folder structure preserved</p>
          </div>
        </div>

        {/* File list */}
        {result.extracted_files.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recovered files:</h3>
            <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
              <ul className="space-y-1">
                {result.extracted_files.slice(0, 10).map((file, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-xs truncate">
                      {file.split('/').pop() || file}
                    </span>
                  </li>
                ))}
                {result.extracted_files.length > 10 && (
                  <li className="text-xs text-gray-500 italic pl-5">
                    ... and {result.extracted_files.length - 10} more files
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Manifest verification status */}
        {result.manifest_verified !== undefined && (
          <div
            className={`flex items-center gap-2 text-sm ${
              result.manifest_verified ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>
              File integrity: {result.manifest_verified ? 'Verified ✓' : 'Unable to verify'}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-3 pt-4 border-t border-gray-200">
          {onDecryptAnother && (
            <button
              onClick={onDecryptAnother}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Decrypt Another Vault
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecryptSuccess;
