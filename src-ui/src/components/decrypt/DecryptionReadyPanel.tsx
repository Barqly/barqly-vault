import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, ChevronLeft, Unlock, Loader2 } from 'lucide-react';
import DestinationSelector from './DestinationSelector';

interface DecryptionReadyPanelProps {
  outputPath: string;
  showAdvancedOptions: boolean;
  isLoading: boolean;
  onPathChange: (path: string) => void;
  onToggleAdvanced: () => void;
  onDecrypt: () => void;
  onPrevious?: () => void;
  /** Whether to auto-focus the decrypt button */
  autoFocus?: boolean;
}

/**
 * Ready-to-decrypt panel showing final confirmation and action buttons
 * Extracted from DecryptPage to reduce component size
 */
const DecryptionReadyPanel: React.FC<DecryptionReadyPanelProps> = ({
  outputPath,
  showAdvancedOptions,
  isLoading,
  onPathChange,
  onToggleAdvanced,
  onDecrypt,
  onPrevious,
  autoFocus = false,
}) => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const decryptButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the decrypt button when panel loads
  useEffect(() => {
    if (autoFocus && decryptButtonRef.current) {
      const timeoutId = setTimeout(() => {
        decryptButtonRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus]);

  const handleDecrypt = async () => {
    setIsDecrypting(true);
    // Call the parent's onDecrypt handler
    await onDecrypt();
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm border-l-4 border-l-teal-600">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Ready to Decrypt Your Vault
        </h3>

        {/* Recovery path row */}
        <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Files will be recovered to:
              </p>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                {formatPathDisplay(outputPath)}
              </p>
            </div>
            <button
              onClick={onToggleAdvanced}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 ml-3"
            >
              {showAdvancedOptions ? 'Hide' : 'Change location'}
            </button>
          </div>
        </div>

        {/* Advanced options */}
        {showAdvancedOptions && (
          <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 mb-4">
            <DestinationSelector
              outputPath={outputPath}
              onPathChange={onPathChange}
              disabled={isLoading}
              requiredSpace={1800000}
            />
          </div>
        )}

        {/* Status checklist */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <CheckCircle className="w-4 h-4 text-teal-600" />
            <span>Valid vault file selected</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <CheckCircle className="w-4 h-4 text-teal-600" />
            <span>Key and passphrase verified</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <CheckCircle className="w-4 h-4 text-teal-600" />
            <span>Recovery location ready</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
          {onPrevious && (
            <button
              onClick={onPrevious}
              className="h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1 transition-colors"
              disabled={isLoading}
              tabIndex={2}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          )}

          <button
            ref={decryptButtonRef}
            onClick={handleDecrypt}
            className="h-10 rounded-xl px-5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isLoading || isDecrypting ? '#94a3b8' : '#1D4ED8',
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !isDecrypting) {
                e.currentTarget.style.backgroundColor = '#1E40AF';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && !isDecrypting) {
                e.currentTarget.style.backgroundColor = '#1D4ED8';
              }
            }}
            disabled={isLoading || isDecrypting}
            tabIndex={1}
          >
            {isDecrypting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Decrypting...
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Decrypt Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecryptionReadyPanel;
