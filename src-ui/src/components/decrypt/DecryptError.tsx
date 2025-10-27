import React, { useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import type { CommandError } from '../../bindings';

interface DecryptErrorProps {
  error: CommandError;
  passphraseAttempts: number;
  onTryAgain: () => void;
}

/**
 * Convert backend errors into user-friendly messages
 */
const getUserFriendlyError = (errorMessage: string): string => {
  const lowerError = errorMessage.toLowerCase();

  // Touch timeout errors (YubiKey) - Multiple patterns from backend
  if (
    lowerError.includes('touch') ||
    lowerError.includes('timeout') ||
    lowerError.includes('failed to decrypt yubikey stanza') || // age CLI error
    lowerError.includes('yubikey plugin') || // age plugin error
    lowerError.includes('pty operation failed') ||
    lowerError.includes('authentication error') ||
    lowerError.includes('communicating with yubikey')
  ) {
    return 'YubiKey touch not detected. Please touch your YubiKey when the light blinks and try again.';
  }

  // PIN blocked (YubiKey)
  if (lowerError.includes('pin is blocked') || lowerError.includes('pin blocked')) {
    return 'PIN is blocked due to too many incorrect attempts. Use your Recovery PIN to unblock it, or reset the YubiKey.';
  }

  // PIN verification failed (YubiKey wrong PIN)
  if (lowerError.includes('pin verification failed')) {
    return 'Incorrect PIN. Please check your PIN and try again.';
  }

  // Device not found (YubiKey unplugged during decrypt)
  if (lowerError.includes('device not found') || lowerError.includes('no yubikey')) {
    return 'YubiKey not found. Please ensure your YubiKey is connected and try again.';
  }

  // Generic passphrase/PIN error (fallback)
  if (
    lowerError.includes('passphrase') ||
    lowerError.includes('incorrect') ||
    lowerError.includes('invalid')
  ) {
    return 'The passphrase or PIN you entered is incorrect. Please check and try again.';
  }

  // Generic fallback
  return 'The passphrase or PIN you entered is incorrect. Please check and try again.';
};

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

  // User-friendly message with backend error detection
  const getUserMessage = () => {
    // Try multiple sources for the error message
    const errorMessage = error?.message || '';
    const errorDetails = error?.details || '';
    const recoveryGuidance = error?.recovery_guidance || '';

    // Debug: Log all error fields
    console.log('DecryptError: Full error object', error);
    console.log('DecryptError: message', errorMessage);
    console.log('DecryptError: details', errorDetails);
    console.log('DecryptError: recovery_guidance', recoveryGuidance);

    // Combine all available error text for pattern matching
    const combinedError = `${errorMessage} ${errorDetails} ${recoveryGuidance}`.toLowerCase();
    console.log('DecryptError: Combined error text for matching', combinedError);

    const friendlyMessage = getUserFriendlyError(combinedError);
    console.log('DecryptError: Friendly message result', friendlyMessage);

    return friendlyMessage;
  };

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Error header */}
      <div className="bg-white dark:bg-slate-800 px-6 py-4 text-center relative">
        <div className="relative z-10">
          {/* Error icon */}
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(185, 28, 28, 0.15)' }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: '#991B1B' }} />
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Decryption Failed
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{getUserMessage()}</p>

          {passphraseAttempts > 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Attempt {passphraseAttempts} - Please check your passphrase carefully
            </p>
          )}
        </div>
      </div>

      <div className="px-6 pt-4 pb-6">
        {/* Action button */}
        <div className="flex justify-center">
          <button
            ref={tryAgainButtonRef}
            onClick={onTryAgain}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500"
            style={{ backgroundColor: '#1D4ED8' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1E40AF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
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
