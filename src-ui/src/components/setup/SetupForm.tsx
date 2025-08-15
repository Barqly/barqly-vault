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
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [tooltipTimeoutId, setTooltipTimeoutId] = React.useState<number | null>(null);
  const passphraseStrength = checkPassphraseStrength(passphrase);
  const isStrongPassphrase = passphraseStrength.isStrong;
  const passphraseMatch = confirmPassphrase.length > 0 && passphrase === confirmPassphrase;

  // Form is valid only when key label exists, passphrase is strong, and passwords match
  const isActuallyFormValid = keyLabel.trim().length > 0 && isStrongPassphrase && passphraseMatch;

  const handleTooltipShow = () => {
    if (tooltipTimeoutId) {
      clearTimeout(tooltipTimeoutId);
    }
    const timeoutId = window.setTimeout(() => {
      setShowTooltip(true);
    }, 175); // 150-200ms range per spec
    setTooltipTimeoutId(timeoutId);
  };

  const handleTooltipHide = () => {
    if (tooltipTimeoutId) {
      window.clearTimeout(tooltipTimeoutId);
      setTooltipTimeoutId(null);
    }
    setShowTooltip(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isActuallyFormValid) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key when Create Key button is focused
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'BUTTON') {
      const target = e.target as HTMLButtonElement;
      if (target.type === 'submit' && isActuallyFormValid) {
        e.preventDefault();
        onSubmit();
      }
    }
  };

  const handleClear = () => {
    onReset();
    // Focus the Key Label input after clearing the form
    setTimeout(() => {
      const keyLabelInput = document.getElementById('key-label');
      if (keyLabelInput) {
        keyLabelInput.focus();
      }
    }, 0);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-[var(--space-4)]">
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
              tabIndex={1}
              className={`w-full rounded-lg border ${keyLabel.trim().length > 0 ? 'border-green-400' : 'border-slate-300'} bg-white text-slate-900 placeholder:text-slate-400 h-12 px-4 pr-28 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-colors`}
            />

            {/* Security indicator in input */}
            <button
              type="button"
              tabIndex={-1}
              className="absolute inset-y-0 right-2 my-auto inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 cursor-help focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500/40"
              aria-label="Keys stay on this device"
              aria-describedby="local-only-help"
              onMouseEnter={handleTooltipShow}
              onMouseLeave={handleTooltipHide}
              onFocus={() => setShowTooltip(true)}
              onBlur={handleTooltipHide}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
                <path
                  fill="currentColor"
                  d="M10 2c.5 0 .9.1 1.3.3l4.7 2.1v4.1c0 4.1-2.6 7.3-6 8.9-3.4-1.6-6-4.8-6-8.9V4.4l4.7-2.1C9.1 2.1 9.5 2 10 2z"
                />
              </svg>
              <span>Keys stay on this device</span>
            </button>

            {/* Tooltip */}
            <div
              id="local-only-help"
              role="tooltip"
              className={`vault-tooltip ${showTooltip ? 'visible' : ''}`}
              style={{
                position: 'absolute',
                bottom: '100%',
                right: '140px', // Position above the shield icon from the right
                transform: 'translateX(50%)',
                marginBottom: '12px', // Nudged up by 4px for better spacing from field border
                backgroundColor: '#fdfdfd',
                color: '#1e293b',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '1.4',
                width: '270px',
                padding: '12px 14px',
                zIndex: 999,
                whiteSpace: 'normal',
                opacity: showTooltip ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out',
                pointerEvents: 'none',
                textAlign: 'center',
              }}
            >
              Your vault key is generated locally and never leaves this device.
              {/* Downward-pointing arrow - perfectly centered with shield icon */}
              <div
                style={{
                  content: '""',
                  position: 'absolute',
                  top: '100%',
                  left: '100px', // Aligned with the shield icon before "Keys stay on this device"
                  transform: 'translateX(-50%)',
                  borderWidth: '6px',
                  borderStyle: 'solid',
                  borderColor: '#fdfdfd transparent transparent transparent',
                  filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05))',
                }}
              />
            </div>

            {keyLabel.trim().length > 0 && (
              <Check className="absolute right-48 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
            )}
          </div>
          {/* Reserved space for validation message */}
          <div className="h-5 mt-1">
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
            tabIndex={2}
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
            tabIndex={3}
            className=""
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-[var(--space-3)] flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleClear}
          title="Clear form (Esc)"
          tabIndex={4}
          className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Clear
        </button>
        <button
          type="submit"
          title="Create key (Enter)"
          disabled={!isActuallyFormValid}
          tabIndex={5}
          onKeyDown={handleKeyDown}
          className={`h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
