import React, { useRef, useEffect, useState } from 'react';
import { CheckCircle, Copy, Check, RotateCcw, Shield } from 'lucide-react';

interface SetupSuccessPanelProps {
  success: {
    public_key: string;
  };
  onClose: () => void;
  onEncryptVault?: () => void;
}

/**
 * Success panel for the setup page
 * Shows generated key information and next steps
 */
const SetupSuccessPanel: React.FC<SetupSuccessPanelProps> = ({
  success,
  onClose,
  onEncryptVault,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const encryptButtonRef = useRef<HTMLButtonElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const createAnotherButtonRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  // Focus management for accessibility - focus the primary CTA button
  useEffect(() => {
    if (success && encryptButtonRef.current) {
      encryptButtonRef.current.focus();
    }
  }, [success]);

  // Focus trap implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Escape to break focus trap
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = [
        encryptButtonRef.current,
        copyButtonRef.current,
        createAnotherButtonRef.current,
      ].filter(Boolean) as HTMLElement[];

      const currentIndex = focusableElements.findIndex((el) => el === document.activeElement);

      // Only trap focus if we're currently focused on one of our elements
      if (currentIndex === -1) return;

      if (e.shiftKey) {
        // Shift+Tab (backward)
        e.preventDefault();
        const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        focusableElements[nextIndex]?.focus();
      } else {
        // Tab (forward)
        e.preventDefault();
        const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
        focusableElements[nextIndex]?.focus();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(success.public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy public key:', error);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
    >
      {/* Compact success header */}
      <div className="bg-white px-6 py-3 text-center relative">
        <div className="relative z-10 flex items-center justify-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div className="text-left">
            <h2 className="text-xl font-semibold text-slate-900">Key generated successfully</h2>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-slate-600 text-center">
          Your encryption keypair has been created and securely stored on this device.
        </p>

        {/* Public key section */}
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Your public key</span>
            <button
              ref={copyButtonRef}
              onClick={handleCopy}
              className="px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
              aria-label="Copy public key to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="font-mono text-xs text-slate-800 break-all bg-white rounded px-2 py-1 border border-slate-200">
            {success.public_key}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Share this key with others so they can encrypt files for you.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-200 bg-white">
          <button
            ref={createAnotherButtonRef}
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Create Another Key
          </button>
          <button
            ref={encryptButtonRef}
            onClick={onEncryptVault}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Encrypt Your Vault
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupSuccessPanel;
