import React from 'react';
import { Check } from 'lucide-react';

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
      <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 px-5 py-3 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-800">What's Included for Recovery:</h3>
      </div>

      {/* Content */}
      <div className="px-5 py-3">
        <p className="text-sm text-slate-600 mb-2">
          Your encrypted bundle includes everything needed for complete recovery:
        </p>

        {/* Checklist of included items */}
        <div className="space-y-2">
          {/* User Files */}
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">Your Files</div>
              <div className="text-xs text-slate-500">
                {fileCount} {fileCount === 1 ? 'item' : 'items'}, {formatFileSize(totalSize)}
              </div>
            </div>
          </div>

          {/* Vault Manifest */}
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">Vault Manifest</div>
              <div className="text-xs text-slate-500">Configuration for "{vaultName}" vault</div>
            </div>
          </div>

          {/* Passphrase Keys */}
          {hasPassphraseKeys && (
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800">Passphrase Keys</div>
                <div className="text-xs text-slate-500">
                  {passphraseKeyCount} .enc {passphraseKeyCount === 1 ? 'file' : 'files'} for
                  recovery
                </div>
              </div>
            </div>
          )}

          {/* Recovery Instructions */}
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">RECOVERY.txt</div>
              <div className="text-xs text-slate-500">Step-by-step recovery instructions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoveryInfoPanel;
