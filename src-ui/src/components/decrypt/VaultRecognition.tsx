import React from 'react';
import { Archive, AlertCircle, CheckCircle } from 'lucide-react';

interface VaultRecognitionProps {
  file: string;
  isKnown: boolean | null;
  vaultName?: string | null;
  onContinue: () => void;
}

/**
 * Component to show vault recognition status after file selection
 * Indicates whether the vault is known or requires recovery mode
 */
const VaultRecognition: React.FC<VaultRecognitionProps> = ({
  file,
  isKnown,
  vaultName,
  onContinue,
}) => {
  // Extract filename from path
  const fileName = file.split('/').pop() || file;

  // Extract file size if available (mock for now)
  const fileSize = '124.8 MB'; // Would come from file info

  if (isKnown === null) {
    // Still checking
    return (
      <div className="mt-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
          <span className="text-slate-700">Checking vault information...</span>
        </div>
      </div>
    );
  }

  if (isKnown) {
    // Known vault - normal decryption
    return (
      <div className="mt-6 p-6 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Vault Recognized
            </h3>
            {vaultName && (
              <p className="text-slate-700 mb-3">
                Vault: <span className="font-medium">{vaultName}</span>
              </p>
            )}
            <button
              onClick={onContinue}
              className="mt-4 h-10 px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Continue to Decryption →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unknown vault - recovery mode
  return (
    <div className="mt-6 space-y-4">
      <div className="p-6 bg-white rounded-lg border border-amber-300">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span>Unknown Vault Detected</span>
            </h3>
            <p className="text-slate-700 mb-4">
              This encrypted file appears to be from a vault not on this device.
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Archive className="w-4 h-4" />
                <span>File: {fileName}</span>
              </div>
              <div className="text-sm text-slate-600">
                Size: {fileSize}
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                <span className="text-lg">ℹ️</span>
                Recovery Mode Active
              </div>
              <p className="text-sm text-amber-700">
                We'll help you decrypt this vault and restore its configuration to this device.
              </p>
            </div>

            <button
              onClick={onContinue}
              className="mt-6 h-10 px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              Continue to Key Discovery →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultRecognition;