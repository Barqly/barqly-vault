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
        title="Key Generated Successfully!"
        message="Your encryption keypair has been created and securely stored."
        showCloseButton={true}
        onClose={onClose}
        details={
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Your Public Key:</p>
            <div className="bg-gray-50 p-3 rounded font-mono text-xs break-all border transition-colors hover:bg-gray-100">
              {success.public_key}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Share this public key with others who need to encrypt files for you.
            </p>
          </div>
        }
        showDetails={true}
      />
    </div>
  );
};

export default SetupSuccessPanel;
