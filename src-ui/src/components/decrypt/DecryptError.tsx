import React, { useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import type { CommandError } from '../../bindings';

interface DecryptErrorProps {
  error: CommandError;
  passphraseAttempts: number;
  onTryAgain: () => void;
}

/**
 * Error view shown when decryption fails
 * Provides clear feedback and retry action
 */
const DecryptError: React.FC<DecryptErrorProps> = ({ error, passphraseAttempts, onTryAgain }) => {
  const tryAgainButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the Try Again button when error screen loads
  useEffect(() => {
    if (tryAgainButtonRef.current) {
      const timeoutId = setTimeout(() => {
        tryAgainButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  const isPassphraseError =
    error.message?.toLowerCase().includes('passphrase') ||
    error.message?.toLowerCase().includes('pin') ||
    error.code === 'WRONG_PASSPHRASE';

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Error header */}
      <div className="bg-white dark:bg-slate-800 px-6 py-4 text-center relative">
        <div className="relative z-10">
          {/* Error icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Decryption Failed
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {isPassphraseError
              ? 'The passphrase or PIN you entered is incorrect.'
              : error.message || 'An error occurred during decryption.'}
          </p>

          {passphraseAttempts > 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Attempt {passphraseAttempts} - Please check your passphrase carefully
            </p>
          )}
        </div>
      </div>

      <div className="px-6 pt-4 pb-6">
        {/* Error details if available */}
        {error.recovery_guidance && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
            <p className="text-sm text-blue-800 dark:text-blue-300">{error.recovery_guidance}</p>
          </div>
        )}

        {/* Action button */}
        <div className="flex justify-center">
          <button
            ref={tryAgainButtonRef}
            onClick={onTryAgain}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500"
            tabIndex={1}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecryptError;
