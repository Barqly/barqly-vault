import React from 'react';
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Key Label Input */}
      <div>
        <label
          htmlFor="key-label"
          className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-2"
        >
          Key Label <span className="text-red-500">*</span>
        </label>
        <input
          id="key-label"
          type="text"
          value={keyLabel}
          onChange={(e) => onKeyLabelChange(e.target.value)}
          placeholder="e.g., Family Vault"
          required={true}
          autoFocus={true}
          className={`w-full rounded-lg border ${keyLabel.trim().length > 0 ? 'border-green-600' : 'border-slate-200'} bg-white px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white`}
        />
        {keyLabel.trim().length > 0 && (
          <div className="mt-2 inline-flex items-center gap-2 text-sm text-green-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Label added
          </div>
        )}
      </div>

      {/* Passphrase Input */}
      <div>
        <label
          htmlFor="passphrase"
          className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-2"
        >
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
          className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-2"
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
      <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
        <span className="font-semibold">Security note:</span> Keys are generated and kept on this
        device. Nothing is sent over the network.
      </p>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onReset}
          title="Clear form (Esc)"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
        >
          Clear
        </button>
        <button
          type="submit"
          title="Create key (Enter)"
          disabled={!isFormValid}
          className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
            !isFormValid
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
