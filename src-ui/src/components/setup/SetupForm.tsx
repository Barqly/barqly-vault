import React from 'react';
import { Shield, Lock } from 'lucide-react';
import EnhancedInput from '../forms/EnhancedInput';
import PassphraseField from '../forms/PassphraseField';
import PrimaryButton from '../ui/PrimaryButton';

interface SetupFormProps {
  keyLabel: string;
  passphrase: string;
  confirmPassphrase: string;
  isFormValid: boolean;
  isLoading: boolean;
  onKeyLabelChange: (value: string) => void;
  onPassphraseChange: (value: string) => void;
  onConfirmPassphraseChange: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
}

/**
 * Form component for key generation setup
 * Handles input fields and validation display
 */
const SetupForm: React.FC<SetupFormProps> = ({
  keyLabel,
  passphrase,
  confirmPassphrase,
  isFormValid,
  isLoading,
  onKeyLabelChange,
  onPassphraseChange,
  onConfirmPassphraseChange,
  onSubmit,
  onReset,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Key Label Input */}
      <EnhancedInput
        id="key-label"
        label="Key Label"
        value={keyLabel}
        onChange={(e) => onKeyLabelChange(e.target.value)}
        placeholder="e.g., Family Bitcoin Vault"
        helper="Choose a memorable name to identify this key"
        required={true}
        size="large"
        success={keyLabel.trim().length > 0}
        autoFocus={true}
      />

      {/* Passphrase Input */}
      <div>
        <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 mb-1">
          Passphrase <span className="text-red-500">*</span>
        </label>
        <PassphraseField
          id="passphrase"
          value={passphrase}
          onChange={onPassphraseChange}
          placeholder="Enter a strong passphrase"
          showStrength={true}
          required={true}
        />
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <Shield className="w-3 h-3" />
          <span>Encrypted locally on your device</span>
        </div>
      </div>

      {/* Confirm Passphrase */}
      <div>
        <label
          htmlFor="confirm-passphrase"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Confirm Passphrase <span className="text-red-500">*</span>
        </label>
        <PassphraseField
          id="confirm-passphrase"
          value={confirmPassphrase}
          onChange={onConfirmPassphraseChange}
          placeholder="Re-enter your passphrase"
          showStrength={false}
          matchValue={passphrase}
          required={true}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <SetupFormFooter />
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-400 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Clear
          </button>
          <PrimaryButton
            type="submit"
            disabled={!isFormValid}
            loading={isLoading}
            loadingText="Creating Key..."
            size="large"
          >
            Create Key
          </PrimaryButton>
        </div>
      </div>
    </form>
  );
};

/**
 * Form footer with keyboard shortcuts and security info
 */
const SetupFormFooter: React.FC = () => {
  return (
    <div className="flex items-center justify-between text-xs text-gray-500">
      <div className="flex items-center gap-2">
        <Lock className="w-3 h-3" />
        <span>Your keys never leave this device</span>
      </div>
      <div>
        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
          Esc
        </kbd>{' '}
        to clear •{' '}
        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
          Enter
        </kbd>{' '}
        to submit
      </div>
    </div>
  );
};

export default SetupForm;
