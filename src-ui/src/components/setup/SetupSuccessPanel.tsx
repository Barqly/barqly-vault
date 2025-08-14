import React, { useRef, useEffect, useState } from 'react';
import { CheckCircle, X, Copy, Check } from 'lucide-react';

interface SetupSuccessPanelProps {
  success: {
    public_key: string;
  };
  onClose: () => void;
}

/**
 * Success panel for the setup page
 * Shows generated key information and next steps
 */
const SetupSuccessPanel: React.FC<SetupSuccessPanelProps> = ({ success, onClose }) => {
  const successMessageRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Focus management for accessibility
  useEffect(() => {
    if (success && successMessageRef.current) {
      successMessageRef.current.focus();
    }
  }, [success]);

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
      className="rounded-2xl border border-green-200 bg-green-50 p-6 md:p-8"
      ref={successMessageRef}
      tabIndex={-1}
      aria-label="Key generation success notification"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <CheckCircle className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-green-800">Key generated successfully</h3>
            <p className="mt-2 text-slate-800">
              Your encryption keypair has been created and securely stored on this device.
            </p>

            <div className="mt-4">
              <p className="text-slate-700 font-medium">Your public key</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 overflow-x-auto whitespace-nowrap rounded-md bg-slate-100 text-slate-800 text-sm px-3 py-2">
                  {success.public_key}
                </div>
                <button
                  onClick={handleCopy}
                  className="inline-flex h-8 items-center px-3 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex-shrink-0"
                  aria-label="Copy public key to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Share this key with others so they can encrypt files for you.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="ml-4 rounded-md p-1.5 text-green-700 hover:text-green-900 transition-colors"
          aria-label="Close success message"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default SetupSuccessPanel;
