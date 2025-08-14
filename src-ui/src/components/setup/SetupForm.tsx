import React from 'react';
import PassphraseField from '../forms/PassphraseField';
import { Check } from 'lucide-react';
import { checkPassphraseStrength } from '../../lib/validation/passphrase-validation';

interface SetupFormProps {
  keyLabel: string;
  passphrase: string;
  confirmPassphrase: string;
  isFormValid: boolean; // Kept for backward compatibility
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
  isFormValid: _isFormValid, // Prefix with _ to indicate intentionally unused
  isLoading,
  onKeyLabelChange,
  onPassphraseChange,
  onConfirmPassphraseChange,
  onSubmit,
  onReset,
}) => {
  const passphraseStrength = checkPassphraseStrength(passphrase);
  const isStrongPassphrase = passphraseStrength.isStrong;
  const passphraseMatch = confirmPassphrase.length > 0 && passphrase === confirmPassphrase;

  // Form is valid only when key label exists, passphrase is strong, and passwords match
  const isActuallyFormValid = keyLabel.trim().length > 0 && isStrongPassphrase && passphraseMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isActuallyFormValid) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Key Label Input */}
      <div>
        <label htmlFor="key-label" className="text-sm font-medium text-slate-700 mb-2 block">
          Key Label <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="key-label"
            type="text"
            value={keyLabel}
            onChange={(e) => onKeyLabelChange(e.target.value)}
            onBlur={() => {
              /* Field touched */
            }}
            placeholder="e.g., Family Vault"
            required={true}
            autoFocus={true}
            className={`w-full rounded-lg border ${keyLabel.trim().length > 0 ? 'border-green-400' : 'border-slate-300'} bg-white text-slate-900 placeholder:text-slate-400 h-12 px-4 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-colors`}
          />
          {keyLabel.trim().length > 0 && (
            <Check className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
          )}
        </div>
        {/* Reserved space for validation message */}
        <div className="h-6 mt-1">
          {keyLabel.trim().length > 0 && (
            <span className="text-sm text-green-700">Label added</span>
          )}
        </div>
      </div>

      {/* Passphrase Input */}
      <div>
        <label htmlFor="passphrase" className="text-sm font-medium text-slate-700 mb-2 block">
          Passphrase <span className="text-red-500">*</span>
        </label>
        <PassphraseField
          id="passphrase"
          value={passphrase}
          onChange={onPassphraseChange}
          placeholder="Enter a strong passphrase"
          showStrength={true}
          required={true}
          className=""
        />
      </div>

      {/* Confirm Passphrase */}
      <div>
        <label
          htmlFor="confirm-passphrase"
          className="text-sm font-medium text-slate-700 mb-2 block"
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
          className=""
        />
      </div>

      {/* Security Note */}
      <p className="text-sm text-slate-500 mt-4">
        Security note: Keys are generated and kept on this device. Nothing is sent over the network.
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={onReset}
          title="Clear form (Esc)"
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
        >
          Clear
        </button>
        <button
          type="submit"
          title="Create key (Enter)"
          disabled={!isActuallyFormValid}
          className={`inline-flex items-center justify-center h-10 px-5 rounded-lg transition-colors ${
            !isActuallyFormValid
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Creating Key...' : 'Create Key'}
        </button>
      </div>
    </form>
  );
};

export default SetupForm;
