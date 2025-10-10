import React from 'react';
import { FileText, Key, Check, Archive } from 'lucide-react';

interface ManifestRestorationProps {
  vaultName?: string | null;
  keyCount?: number;
  onConfirm: () => void;
  onSkip?: () => void;
}

/**
 * Component to show what will be restored during vault recovery
 * Displayed after successful key validation but before decryption
 */
const ManifestRestoration: React.FC<ManifestRestorationProps> = ({
  vaultName,
  keyCount = 1,
  onConfirm,
  onSkip,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Archive className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800">
          Vault Restoration
        </h3>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-slate-700 mb-3">
          Found vault configuration in encrypted bundle:
        </p>

        <div className="space-y-2">
          {vaultName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Name:</span>
              <span className="font-medium text-slate-800">{vaultName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Recipients:</span>
            <span className="font-medium text-slate-800">{keyCount} {keyCount === 1 ? 'key' : 'keys'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Version:</span>
            <span className="font-medium text-slate-800">2</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 mt-0.5 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-800">
              Vault manifest will be restored
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              The vault configuration will be added to your device
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-5 h-5 mt-0.5 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-800">
              Passphrase key will be imported
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              The encrypted key file will be added to your key registry
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-5 h-5 mt-0.5 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-800">
              Files will be extracted
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              All encrypted files will be decrypted to the selected location
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {onSkip && (
          <button
            onClick={onSkip}
            className="h-10 px-4 text-slate-600 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Skip Restoration
          </button>
        )}
        <button
          onClick={onConfirm}
          className="h-10 px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-auto"
        >
          Complete Restoration
        </button>
      </div>
    </div>
  );
};

export default ManifestRestoration;