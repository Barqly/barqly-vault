import React from 'react';
import { Loader2, AlertTriangle, Fingerprint, Eye, EyeOff } from 'lucide-react';
import { YubiKeyStateInfo } from '../../bindings';

interface YubiKeyReusedWithTdesFormProps {
  selectedKey: YubiKeyStateInfo;
  label: string;
  setLabel: (value: string) => void;
  pin: string;
  setPin: (value: string) => void;
  showPin: boolean;
  setShowPin: (value: boolean) => void;
  isSetupInProgress: boolean;
  showTouchPrompt: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  firstFocusableRef: React.RefObject<HTMLInputElement | null>;
  lastFocusableRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Form for REUSED YubiKeys with TDES (Scenario 3)
 * Already has PIN/PUK and TDES management key
 * Just needs to generate age encryption key
 * Touch required
 */
export const YubiKeyReusedWithTdesForm: React.FC<YubiKeyReusedWithTdesFormProps> = ({
  selectedKey,
  label,
  setLabel,
  pin,
  setPin,
  showPin,
  setShowPin,
  isSetupInProgress,
  showTouchPrompt,
  error,
  onSubmit,
  onCancel,
  onKeyDown,
  firstFocusableRef,
  lastFocusableRef,
}) => {
  return (
    <div className="space-y-4" onKeyDown={onKeyDown}>
      {/* S/N */}
      <div>
        <p className="text-sm text-main">
          <span className="font-medium">S/N:</span> {selectedKey.serial}
        </p>
      </div>

      {/* YubiKey Label */}
      <div>
        <label className="block text-sm font-medium text-main mb-2">YubiKey Label *</label>
        <input
          ref={firstFocusableRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={24}
          className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main"
          placeholder="e.g., Personal YubiKey"
        />
        <p className="mt-1 text-xs" style={{ color: label.length >= 24 ? '#B91C1C' : '#64748b' }}>
          {label.length}/24 characters
        </p>
      </div>

      {/* PIN Field (your custom PIN) */}
      <div>
        <label className="block text-sm font-medium text-main mb-2">PIN (your custom PIN) *</label>
        <div className="relative">
          <input
            id="yubikey-pin-reused"
            type={showPin ? 'text' : 'password'}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={8}
            className="w-full px-3 py-2 pr-10 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main placeholder-gray-400"
            placeholder="Enter your PIN"
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
            aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
          >
            {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Touch Prompt */}
      {showTouchPrompt && (
        <div
          className="p-4 rounded-lg border-2 animate-pulse"
          style={{
            backgroundColor: 'rgba(249, 139, 28, 0.1)',
            borderColor: '#F98B1C',
          }}
        >
          <div className="flex items-center gap-3">
            <Fingerprint className="h-6 w-6 flex-shrink-0" style={{ color: '#F98B1C' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F98B1C' }}>
                Touch your YubiKey now
              </p>
              <p className="text-xs text-secondary mt-0.5">The green light should be blinking</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'rgba(185, 28, 28, 0.15)',
            borderColor: '#991B1B',
          }}
        >
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#991B1B' }} />
            <p className="text-sm" style={{ color: '#FCA5A5' }}>
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          ref={lastFocusableRef}
          onClick={onSubmit}
          disabled={isSetupInProgress || !label.trim() || !pin}
          className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
          style={
            !(isSetupInProgress || !label.trim() || !pin)
              ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' }
              : {
                  backgroundColor: 'rgb(var(--surface-hover))',
                  color: 'rgb(var(--text-muted))',
                  borderColor: 'rgb(var(--border-default))',
                }
          }
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = '#1E40AF';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
            }
          }}
        >
          {isSetupInProgress ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Key'
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isSetupInProgress}
          tabIndex={-1}
          className="px-4 py-2 text-main bg-hover rounded-lg hover:bg-hover"
        >
          Back
        </button>
      </div>
    </div>
  );
};
