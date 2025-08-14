import React, { useState } from 'react';
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
}) => {
  const [isDecrypting, setIsDecrypting] = useState(false);

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
    <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-green-800 mb-3">Ready to Decrypt Your Vault</h3>

      {/* Recovery path row */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">Files will be recovered to:</p>
            <p className="text-sm font-mono text-slate-700">{formatPathDisplay(outputPath)}</p>
          </div>
          <button onClick={onToggleAdvanced} className="text-xs text-blue-600 hover:underline ml-3">
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
            disabled={isLoading}
            requiredSpace={1800000}
          />
        </div>
      )}

      {/* Checklist (3 items) */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>Valid vault file selected</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>Key and passphrase verified</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>Recovery location ready</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        {onPrevious && (
          <button
            onClick={onPrevious}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
        )}

        <button
          onClick={handleDecrypt}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1 focus-visible:ring-2 ring-blue-300 ring-offset-2"
          disabled={isLoading || isDecrypting}
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
  );
};

export default DecryptionReadyPanel;
