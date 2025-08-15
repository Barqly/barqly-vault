import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, ChevronLeft, Lock, Loader2 } from 'lucide-react';
import { documentDir, join } from '@tauri-apps/api/path';
import DestinationSelector from './DestinationSelector';

interface EncryptionReadyPanelProps {
  outputPath: string;
  archiveName: string;
  showAdvancedOptions: boolean;
  isLoading: boolean;
  onPathChange: (path: string) => void;
  onArchiveNameChange: (name: string) => void;
  onToggleAdvanced: () => void;
  onEncrypt: () => void;
  onPrevious?: () => void;
  autoFocus?: boolean;
}

/**
 * Ready-to-encrypt panel showing final confirmation and action buttons
 * Mirrors DecryptionReadyPanel architecture exactly
 */
const EncryptionReadyPanel: React.FC<EncryptionReadyPanelProps> = ({
  outputPath,
  archiveName,
  showAdvancedOptions,
  isLoading,
  onPathChange,
  onArchiveNameChange,
  onToggleAdvanced,
  onEncrypt,
  onPrevious,
  autoFocus = false,
}) => {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [defaultPath, setDefaultPath] = useState<string>('~/Documents/Barqly-Vaults');
  const encryptButtonRef = useRef<HTMLButtonElement>(null);

  // Get platform-appropriate default path
  useEffect(() => {
    const getDefaultPath = async () => {
      try {
        const docsPath = await documentDir();
        const vaultsPath = await join(docsPath, 'Barqly-Vaults');
        setDefaultPath(vaultsPath);
      } catch (error) {
        console.error('Error getting default path:', error);
        // Fallback to platform-appropriate default
        setDefaultPath('~/Documents/Barqly-Vaults');
      }
    };
    getDefaultPath();
  }, []);

  // Auto-focus the Encrypt Now button when the panel loads
  useEffect(() => {
    if (autoFocus && encryptButtonRef.current && !isLoading && !isEncrypting) {
      // Use a small timeout to ensure the component is fully rendered
      const timeoutId = setTimeout(() => {
        encryptButtonRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus, isLoading, isEncrypting]);

  const handleEncrypt = async () => {
    setIsEncrypting(true);
    // Call the parent's onEncrypt handler
    await onEncrypt();
    // Parent will handle resetting state
  };

  const formatPathDisplay = (path: string): string => {
    if (path.startsWith('/Users/')) {
      return path.replace(/^\/Users\/[^/]+/, '~');
    }
    if (path.startsWith('C:\\Users\\')) {
      const simplified = path.replace(/^C:\\Users\\[^\\]+/, '~');
      return simplified.replace(/\\/g, '/');
    }
    return path;
  };

  const displayPath = outputPath || defaultPath;
  const displayName = archiveName ? `${archiveName}.age` : 'Auto-generated filename';

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm border-l-green-500 rounded-l-lg">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Ready to Encrypt Your Vault</h3>

        {/* Output location display */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-1">Vault will be saved to:</p>
              <p className="text-sm font-mono text-slate-700">{formatPathDisplay(displayPath)}</p>
              {archiveName && (
                <p className="text-xs text-slate-500 mt-1">Filename: {displayName}</p>
              )}
            </div>
            <button
              onClick={onToggleAdvanced}
              className="text-xs text-blue-600 hover:text-blue-700 ml-3 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
              tabIndex={2}
            >
              {showAdvancedOptions ? 'Hide' : 'Change location'}
            </button>
          </div>
        </div>

        {/* Advanced options */}
        {showAdvancedOptions && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <DestinationSelector
              outputPath={outputPath}
              onPathChange={onPathChange}
              archiveName={archiveName}
              onNameChange={onArchiveNameChange}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Status checklist */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Files selected and ready</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Encryption key verified</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Output location ready</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {onPrevious && (
            <button
              onClick={onPrevious}
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1"
              disabled={isLoading}
              tabIndex={3}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          )}

          <button
            ref={encryptButtonRef}
            onClick={handleEncrypt}
            className="h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
            disabled={isLoading || isEncrypting}
            tabIndex={1}
          >
            {isEncrypting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Encrypting...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Encrypt Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncryptionReadyPanel;
