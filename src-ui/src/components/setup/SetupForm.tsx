import React from 'react';
import EnhancedInput from '../forms/EnhancedInput';
import PassphraseField from '../forms/PassphraseField';

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Key Label Input */}
      <EnhancedInput
        id="key-label"
        label="Key Label"
        value={keyLabel}
        onChange={(e) => onKeyLabelChange(e.target.value)}
        placeholder="e.g., Family Vault"
        required={true}
        size="large"
        success={keyLabel.trim().length > 0}
        autoFocus={true}
      />

      {/* Passphrase Input */}
      <div>
        <label htmlFor="passphrase" className="block text-sm font-medium text-slate-700 mb-1">
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
      </div>

      {/* Confirm Passphrase */}
      <div>
        <label
          htmlFor="confirm-passphrase"
          className="block text-sm font-medium text-slate-700 mb-1"
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

      {/* Security Note */}
      <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-gray-500">
        <span className="font-semibold">Security note:</span> Keys are generated and kept on this
        device. Nothing is sent over the network.
      </p>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={onReset}
          title="Clear form (Esc)"
          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 transition-colors"
        >
          Clear
        </button>
        <button
          type="submit"
          title="Create key (Enter)"
          disabled={!isFormValid}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 transition-colors"
        >
          {isLoading ? 'Creating Key...' : 'Create Key'}
        </button>
      </div>
    </form>
  );
};

export default SetupForm;
