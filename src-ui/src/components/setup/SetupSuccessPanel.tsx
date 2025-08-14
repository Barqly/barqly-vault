import React, { useRef, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

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

  // Focus management for accessibility
  useEffect(() => {
    if (success && successMessageRef.current) {
      successMessageRef.current.focus();
    }
  }, [success]);

  return (
    <div
      className="rounded-2xl border border-green-200 bg-green-50 p-6"
      ref={successMessageRef}
      tabIndex={-1}
      aria-label="Key generation success notification"
    >
      <div className="flex items-start gap-3">
        <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-green-700">Key generated successfully</h3>
          <p className="mt-1 text-sm text-slate-700">
            Your encryption keypair has been created and securely stored on this device.
          </p>

          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700">Your public key</p>
            <code className="mt-2 block w-full truncate rounded-lg bg-slate-100 px-3 py-2 text-[13px] text-slate-800">
              {success.public_key}
            </code>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Share this key with others so they can encrypt files for you.
          </p>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default SetupSuccessPanel;
