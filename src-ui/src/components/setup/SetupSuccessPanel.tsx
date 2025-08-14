import React, { useRef, useEffect } from 'react';
import { SuccessMessage } from '../ui/success-message';

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
      className="animate-in slide-in-from-top-4 duration-500 ease-out"
      ref={successMessageRef}
      tabIndex={-1}
      aria-label="Key generation success notification"
    >
      <SuccessMessage
        title="Key generated successfully"
        message="Your encryption keypair has been created and securely stored on this device."
        showCloseButton={true}
        onClose={onClose}
        size="lg"
        details={
          <div className="mt-4">
            <label className="block mb-1 text-sm font-medium text-gray-800">Your public key</label>
            <div className="bg-gray-100 rounded-lg p-2 font-mono text-sm text-gray-800 break-all mt-2 mb-3">
              {success.public_key}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Share this key with others so they can encrypt files for you.
            </p>
          </div>
        }
        showDetails={true}
      />
    </div>
  );
};

export default SetupSuccessPanel;
