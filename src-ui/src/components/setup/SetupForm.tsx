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
  const [tooltipTimeoutId, setTooltipTimeoutId] = React.useState<NodeJS.Timeout | null>(null);
  const passphraseStrength = checkPassphraseStrength(passphrase);
  const isStrongPassphrase = passphraseStrength.isStrong;
  const passphraseMatch = confirmPassphrase.length > 0 && passphrase === confirmPassphrase;

  // Form is valid only when key label exists, passphrase is strong, and passwords match
  const isActuallyFormValid = keyLabel.trim().length > 0 && isStrongPassphrase && passphraseMatch;

  const handleTooltipShow = () => {
    if (tooltipTimeoutId) {
      clearTimeout(tooltipTimeoutId);
    }
    const timeoutId = setTimeout(() => {
      setShowTooltip(true);
    }, 175); // 150-200ms range per spec
    setTooltipTimeoutId(timeoutId);
  };

  const handleTooltipHide = () => {
    if (tooltipTimeoutId) {
      clearTimeout(tooltipTimeoutId);
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

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-[var(--space-5)] md:gap-[var(--space-6)]">
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
            className={`w-full rounded-lg border ${keyLabel.trim().length > 0 ? 'border-green-400' : 'border-slate-300'} bg-white text-slate-900 placeholder:text-slate-400 h-12 px-4 pr-28 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-colors`}
          />
          
          {/* Security indicator in input */}
          <button
            type="button"
            className="absolute inset-y-0 right-2 my-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-help focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500/40"
            aria-label="Keys stay on this device"
            aria-describedby="local-only-help"
            onMouseEnter={handleTooltipShow}
            onMouseLeave={handleTooltipHide}
            onFocus={() => setShowTooltip(true)}
            onBlur={handleTooltipHide}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
              <path fill="currentColor" d="M10 2c.5 0 .9.1 1.3.3l4.7 2.1v4.1c0 4.1-2.6 7.3-6 8.9-3.4-1.6-6-4.8-6-8.9V4.4l4.7-2.1C9.1 2.1 9.5 2 10 2z"/>
            </svg>
            <span>Keys stay on this device</span>
          </button>

          {/* Tooltip */}
          <div
            id="local-only-help"
            role="tooltip"
            className={`pointer-events-none absolute right-1 z-30 mt-2 w-[280px] rounded-md bg-white px-3 py-2 text-sm font-normal shadow-[0px_2px_8px_rgba(0,0,0,0.12)] transition-all duration-[120ms] ease-out ${
              showTooltip ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'
            }`}
            style={{ 
              color: '#2C2C2C',
              lineHeight: '1.45',
              border: '1px solid #e2e8f0'
            }}
          >
            Your vault key is generated locally and never leaves this device.
            {/* Arrow - 6px width, reduced height */}
            <div 
              className="absolute -top-1 right-6 h-1.5 w-1.5 rotate-45 bg-white"
              style={{ borderLeft: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}
            ></div>
          </div>
          
          {keyLabel.trim().length > 0 && (
            <Check className="absolute right-32 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
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
      </div>

      {/* Action Buttons */}
      <div className="mt-[var(--space-4)] flex items-center justify-end gap-[var(--space-3)]">
        <button
          type="button"
          onClick={onReset}
          title="Clear form (Esc)"
          className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Clear
        </button>
        <button
          type="submit"
          title="Create key (Enter)"
          disabled={!isActuallyFormValid}
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
