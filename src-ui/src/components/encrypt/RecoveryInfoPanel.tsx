import React from 'react';
import { Package, Check, Info } from 'lucide-react';

interface RecoveryInfoPanelProps {
  fileCount: number;
  totalSize: number;
  hasPassphraseKeys: boolean;
  passphraseKeyCount: number;
  vaultName: string;
  isExpanded?: boolean;
}

/**
 * RecoveryInfoPanel - Shows what's included in the recovery bundle
 * Visual panel that displays what recovery items will be bundled with the encrypted files
 */
const RecoveryInfoPanel: React.FC<RecoveryInfoPanelProps> = ({
  fileCount,
  totalSize,
  hasPassphraseKeys,
  passphraseKeyCount,
  vaultName,
  isExpanded = true,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-semibold text-slate-800">What's Included for Recovery</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-sm text-slate-600 mb-4">
          Your encrypted bundle will contain everything needed for recovery:
        </p>

        {/* Checklist of included items */}
        <div className="space-y-3">
          {/* User Files */}
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">
                Your Files
              </div>
              <div className="text-xs text-slate-500">
                {fileCount} {fileCount === 1 ? 'item' : 'items'}, {formatFileSize(totalSize)}
              </div>
            </div>
          </div>

          {/* Vault Manifest */}
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">
                Vault Manifest
              </div>
              <div className="text-xs text-slate-500">
                Configuration for "{vaultName}" vault
              </div>
            </div>
          </div>

          {/* Passphrase Keys */}
          {hasPassphraseKeys && (
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800">
                  Passphrase Keys
                </div>
                <div className="text-xs text-slate-500">
                  {passphraseKeyCount} .enc {passphraseKeyCount === 1 ? 'file' : 'files'} for recovery
                </div>
              </div>
            </div>
          )}

          {/* Recovery Instructions */}
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">
                RECOVERY.txt
              </div>
              <div className="text-xs text-slate-500">
                Step-by-step recovery instructions
              </div>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-5 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-800 mb-1">
                Recovery Ready
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">
                This bundle can be decrypted on any device with your key. All necessary recovery information is included automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoveryInfoPanel;