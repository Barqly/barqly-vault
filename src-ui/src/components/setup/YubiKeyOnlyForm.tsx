import React from 'react';

interface YubiKeyOnlyFormProps {
  keyLabel: string;
  yubiKeyPin: string;
  isLoading: boolean;
  onKeyLabelChange: (value: string) => void;
  onYubiKeyPinChange: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
}

/**
 * Form component for YubiKey-only key generation
 * Shows only key label field without passphrase fields
 */
export const YubiKeyOnlyForm: React.FC<YubiKeyOnlyFormProps> = ({
  keyLabel,
  yubiKeyPin,
  isLoading,
  onKeyLabelChange,
  onYubiKeyPinChange,
  onSubmit,
  onReset,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div>
        <label htmlFor="key-label" className="block text-sm font-medium text-gray-700 mb-2">
          Key Label <span className="text-red-500">*</span>
        </label>
        <input
          id="key-label"
          type="text"
          value={keyLabel}
          onChange={(e) => onKeyLabelChange(e.target.value)}
          placeholder="Enter a name for your vault key"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
        {keyLabel.trim().length > 0 && (
          <div className="flex items-center mt-2 text-sm text-green-600">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="mr-2">Label added</span>
            <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-500">Keys stay on this device</span>
          </div>
        )}
      </div>

      {/* YubiKey PIN Input */}
      <div>
        <label htmlFor="yubikey-pin" className="block text-sm font-medium text-gray-700 mb-2">
          YubiKey PIN <span className="text-red-500">*</span>
        </label>
        <input
          id="yubikey-pin"
          type="password"
          value={yubiKeyPin}
          onChange={(e) => onYubiKeyPinChange(e.target.value)}
          placeholder="Enter your YubiKey PIN (6-8 digits)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          maxLength={8}
          minLength={4}
        />
        <p className="mt-1 text-xs text-gray-500">
          Your YubiKey PIN (default is 123456 for new YubiKeys)
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || keyLabel.trim().length === 0 || yubiKeyPin.trim().length === 0}
          className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isLoading || keyLabel.trim().length === 0 || yubiKeyPin.trim().length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Creating Key...' : 'Create Key'}
        </button>
      </div>
    </div>
  );
};
