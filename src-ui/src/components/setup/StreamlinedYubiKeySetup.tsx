import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { YubiKeyStateInfo } from '../../lib/api-types';

type YubiKeyStateType = 'new' | 'initialized' | 'reused' | 'orphaned' | 'registered' | 'unknown';

interface StreamlinedYubiKeySetupProps {
  yubikeys: YubiKeyStateInfo[];
  isLoading?: boolean;
  onInitComplete?: (serial: string) => void;
  onRegisterComplete?: (serial: string) => void;
}

export const StreamlinedYubiKeySetup: React.FC<StreamlinedYubiKeySetupProps> = ({
  yubikeys,
  isLoading = false,
  onInitComplete,
  onRegisterComplete,
}) => {
  const [selectedYubiKey, setSelectedYubiKey] = useState<YubiKeyStateInfo | null>(
    yubikeys.length === 1 ? yubikeys[0] : null,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Detecting YubiKey state...</span>
      </div>
    );
  }

  if (yubikeys.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No YubiKey Detected</h3>
        <p className="text-gray-600">
          Please insert your YubiKey to continue with hardware protection
        </p>
      </div>
    );
  }

  if (!selectedYubiKey) {
    // Multiple YubiKeys - show selection
    return (
      <div>
        <h3 className="text-lg font-medium mb-4">Select YubiKey</h3>
        {yubikeys.map((yk) => (
          <div
            key={yk.serial}
            className="border rounded-lg p-4 mb-3 cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedYubiKey(yk)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">YubiKey ({yk.serial})</div>
                <div className="text-sm text-gray-600">State: {yk.state}</div>
              </div>
              <StateIndicator state={yk.state} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single YubiKey or selected YubiKey - show state-specific UI
  return (
    <div>
      <YubiKeyStateCard yubikey={selectedYubiKey} />
      <StateSpecificSetup
        yubikey={selectedYubiKey}
        onInitComplete={onInitComplete}
        onRegisterComplete={onRegisterComplete}
      />
    </div>
  );
};

const StateIndicator: React.FC<{ state: YubiKeyStateType }> = ({ state }) => {
  switch (state) {
    case 'initialized':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'reused':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'new':
      return <Shield className="h-5 w-5 text-blue-500" />;
    default:
      return <div className="h-5 w-5" />;
  }
};

const YubiKeyStateCard: React.FC<{ yubikey: YubiKeyStateInfo }> = ({ yubikey }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Shield className="h-6 w-6 text-blue-600 mr-3" />
        <div>
          <div className="font-medium">
            {(yubikey as any).label || `YubiKey (${yubikey.serial})`}
          </div>
          <div className="text-sm text-gray-600">Serial: {yubikey.serial}</div>
        </div>
      </div>
      <StateIndicator state={yubikey.state} />
    </div>
  </div>
);

const StateSpecificSetup: React.FC<{
  yubikey: YubiKeyStateInfo;
  onInitComplete?: (serial: string) => void;
  onRegisterComplete?: (serial: string) => void;
}> = ({ yubikey, onInitComplete, onRegisterComplete }) => {
  switch (yubikey.state) {
    case 'initialized':
      return (
        <div className="text-center py-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-green-700 mb-2">YubiKey Ready!</h3>
          <p className="text-green-600">
            {(yubikey as any).label} is configured and ready for vault protection
          </p>
        </div>
      );

    case 'new':
      return <NewYubiKeySetup yubikey={yubikey} onComplete={onInitComplete} />;

    case 'reused':
      return <ReusedYubiKeySetup yubikey={yubikey} onComplete={onRegisterComplete} />;

    default:
      return <div>Unknown YubiKey state</div>;
  }
};

const NewYubiKeySetup: React.FC<{
  yubikey: YubiKeyStateInfo;
  onComplete?: (serial: string) => void;
}> = ({ yubikey, onComplete }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [label, setLabel] = useState('');

  const isValid = newPin.length >= 6 && newPin === confirmPin && label.trim().length > 0;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-blue-700 mb-2">Setup New YubiKey</h3>
        <p className="text-gray-600">
          This YubiKey is brand new (default PIN). Set a secure PIN and label.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YubiKey Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., My-Vault-Key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New PIN (6-8 digits)
          </label>
          <input
            type="password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="Enter new PIN"
            maxLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Confirm new PIN"
            maxLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          disabled={!isValid}
          onClick={() => onComplete?.(yubikey.serial)}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isValid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Initialize YubiKey
        </button>
      </div>
    </div>
  );
};

const ReusedYubiKeySetup: React.FC<{
  yubikey: YubiKeyStateInfo;
  onComplete?: (serial: string) => void;
}> = ({ yubikey, onComplete }) => {
  const [label, setLabel] = useState('');

  const isValid = label.trim().length > 0;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-orange-700 mb-2">Register YubiKey</h3>
        <p className="text-gray-600">
          This YubiKey has a custom PIN but isn't configured for Barqly Vault yet.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YubiKey Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Work-Vault-Key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          disabled={!isValid}
          onClick={() => onComplete?.(yubikey.serial)}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isValid
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Register YubiKey
        </button>
      </div>
    </div>
  );
};

export default StreamlinedYubiKeySetup;
