import React, { useState, useEffect } from 'react';
import { CheckCircle, Copy, FolderOpen, BookOpen, RotateCcw, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface EncryptionSuccessProps {
  outputPath: string;
  fileName: string;
  fileCount: number;
  originalSize: number;
  encryptedSize: number;
  duration: number;
  keyUsed: string;
  onEncryptMore: () => void;
  onViewGuide?: () => void;
}

const EncryptionSuccess: React.FC<EncryptionSuccessProps> = ({
  outputPath,
  fileName,
  fileCount,
  originalSize,
  encryptedSize,
  duration,
  keyUsed,
  onEncryptMore,
  onViewGuide,
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

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

  const getCompressionRatio = (): string => {
    if (originalSize === 0) return '0%';
    const ratio = ((originalSize - encryptedSize) / originalSize) * 100;
    return ratio > 0 ? `${Math.round(ratio)}% compression` : 'No compression';
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

  const handleOpenFolder = async () => {
    try {
      await invoke('open_folder', { path: outputPath });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const handleShowInFinder = async () => {
    try {
      const fullPath = `${outputPath}/${fileName}`;
      await invoke('show_in_folder', { path: fullPath });
    } catch (error) {
      console.error('Failed to show in finder:', error);
    }
  };

  return (
    <div className="relative">
      {/* Success Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="animate-bounce absolute top-4 left-4">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <div className="animate-bounce absolute top-8 right-8" style={{ animationDelay: '0.1s' }}>
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
          </div>
          <div
            className="animate-bounce absolute bottom-8 left-12"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          </div>
          <div
            className="animate-bounce absolute bottom-4 right-4"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="w-4 h-4 bg-purple-500 rounded-full" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg border border-green-200 p-8">
        {/* Success Icon and Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vault Successfully Created!</h2>
          <p className="text-gray-600">
            Your files are now protected with military-grade encryption and ready for long-term
            storage.
          </p>
        </div>

        {/* Vault Location */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Vault Location:</span>
          </div>
          <div className="bg-white border border-gray-200 rounded p-3 font-mono text-sm text-gray-700 break-all">
            {outputPath}/{fileName}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCopyPath}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Path'}
            </button>
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Open Folder
            </button>
            <button
              onClick={handleShowInFinder}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Show in Finder
            </button>
          </div>
        </div>

        {/* Encryption Summary */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Encryption Summary
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Files encrypted:</span>
              <span className="ml-2 font-medium text-gray-700">
                {fileCount} {fileCount === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Original size:</span>
              <span className="ml-2 font-medium text-gray-700">{formatFileSize(originalSize)}</span>
            </div>
            <div>
              <span className="text-gray-500">Encrypted size:</span>
              <span className="ml-2 font-medium text-gray-700">
                {formatFileSize(encryptedSize)} ({getCompressionRatio()})
              </span>
            </div>
            <div>
              <span className="text-gray-500">Encryption time:</span>
              <span className="ml-2 font-medium text-gray-700">{duration} seconds</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Encryption key:</span>
              <span className="ml-2 font-medium text-gray-700">{keyUsed}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Algorithm:</span>
              <span className="ml-2 font-medium text-gray-700">
                age v1.0 (X25519, ChaCha20Poly1305)
              </span>
            </div>
          </div>
        </div>

        {/* Next Actions */}
        <div>
          <p className="text-sm text-gray-600 mb-4">What would you like to do next?</p>
          <div className="flex gap-3">
            <button
              onClick={onEncryptMore}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RotateCcw className="w-4 h-4" />
              Encrypt More Files
            </button>
            {onViewGuide && (
              <button
                onClick={onViewGuide}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <BookOpen className="w-4 h-4" />
                View Decryption Guide
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptionSuccess;
