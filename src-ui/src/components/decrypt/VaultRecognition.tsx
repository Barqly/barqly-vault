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

  if (isKnown === null) {
    // Still checking
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
          <span className="text-slate-700 dark:text-slate-300">Checking vault information...</span>
        </div>
      </div>
    );
  }

  if (isKnown) {
    // Known vault - normal decryption
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Vault Recognized</h3>
            {vaultName && (
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                Vault: <span className="font-medium">{vaultName}</span>
              </p>
            )}
            <button
              onClick={onContinue}
              className="mt-3 h-10 px-5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              style={{ backgroundColor: '#1D4ED8' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
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
    <div className="space-y-4">
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-amber-300 dark:border-amber-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
              <span>Unknown Vault Detected</span>
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              This encrypted file appears to be from a vault not on this device.
            </p>

            <div className="space-y-1 mb-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Archive className="w-4 h-4" />
                <span>File: {fileName}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium mb-1">
                <span className="text-base">ℹ️</span>
                Recovery Mode Active
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                We'll help you decrypt this vault and restore its configuration to this device.
              </p>
            </div>

            <button
              onClick={onContinue}
              className="mt-4 h-10 px-5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 transition-colors"
              style={{ backgroundColor: '#1D4ED8' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
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
