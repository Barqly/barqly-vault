import React from 'react';
import { Loader2, AlertTriangle, Fingerprint, Eye, EyeOff, Info, ChevronDown } from 'lucide-react';
import { YubiKeyStateInfo } from '../../bindings';

interface YubiKeyNewFormProps {
  selectedKey: YubiKeyStateInfo;
  label: string;
  setLabel: (value: string) => void;
  pin: string;
  setPin: (value: string) => void;
  confirmPin: string;
  setConfirmPin: (value: string) => void;
  recoveryPin: string;
  setRecoveryPin: (value: string) => void;
  confirmRecoveryPin: string;
  setConfirmRecoveryPin: (value: string) => void;
  showPin: boolean;
  setShowPin: (value: boolean) => void;
  showRecoveryPin: boolean;
  setShowRecoveryPin: (value: boolean) => void;
  showSecurityTips: boolean;
  setShowSecurityTips: (value: boolean) => void;
  isSetupInProgress: boolean;
  showTouchPrompt: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  firstFocusableRef: React.RefObject<HTMLInputElement | null>;
  lastFocusableRef: React.RefObject<HTMLButtonElement | null>;
  formReadOnly: boolean;
}

/**
 * Form for NEW YubiKeys (Scenario 1)
 * Factory default state - needs full initialization
 * Sets PIN, Recovery PIN, and generates age encryption key
 * Touch required
 */
export const YubiKeyNewForm: React.FC<YubiKeyNewFormProps> = ({
  selectedKey,
  label,
  setLabel,
  pin,
  setPin,
  confirmPin,
  setConfirmPin,
  recoveryPin,
  setRecoveryPin,
  confirmRecoveryPin,
  setConfirmRecoveryPin,
  showPin,
  setShowPin,
  showRecoveryPin,
  setShowRecoveryPin,
  showSecurityTips,
  setShowSecurityTips,
  isSetupInProgress,
  showTouchPrompt,
  error,
  onSubmit,
  onCancel,
  onKeyDown,
  firstFocusableRef,
  lastFocusableRef,
  formReadOnly,
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
          readOnly={formReadOnly}
          className={`w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main ${formReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
          placeholder="e.g., Personal YubiKey"
        />
        <p className="mt-1 text-xs" style={{ color: label.length >= 24 ? '#B91C1C' : '#64748b' }}>
          {label.length}/24 characters
        </p>
      </div>

      {/* PIN Fields - 2 Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-main mb-2">Create PIN *</label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={8}
              readOnly={formReadOnly}
              className={`w-full px-3 py-2 pr-10 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main placeholder-gray-400 ${formReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              placeholder="6-8 digits"
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

        <div>
          <label className="block text-sm font-medium text-main mb-2">Confirm PIN *</label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              maxLength={8}
              readOnly={formReadOnly}
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-input text-main placeholder-gray-400 ${formReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={
                confirmPin
                  ? pin === confirmPin
                    ? ({
                        borderColor: 'rgb(var(--border-default))',
                        '--tw-ring-color': 'rgb(59, 130, 246)',
                      } as React.CSSProperties)
                    : ({
                        borderColor: '#991B1B',
                        '--tw-ring-color': '#991B1B',
                      } as React.CSSProperties)
                  : ({
                      borderColor: 'rgb(var(--border-default))',
                      '--tw-ring-color': 'rgb(59, 130, 246)',
                    } as React.CSSProperties)
              }
              placeholder="6-8 digits"
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
          {confirmPin && (
            <p
              className="text-xs mt-1"
              style={{ color: pin === confirmPin ? 'inherit' : '#991B1B' }}
            >
              {pin === confirmPin ? '' : 'PINs do not match'}
            </p>
          )}
        </div>
      </div>

      {/* Recovery PIN Fields - 2 Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-main mb-2">Recovery PIN *</label>
          <div className="relative">
            <input
              type={showRecoveryPin ? 'text' : 'password'}
              value={recoveryPin}
              onChange={(e) => setRecoveryPin(e.target.value)}
              maxLength={8}
              readOnly={formReadOnly}
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-input text-main placeholder-gray-400 ${formReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={
                recoveryPin && pin
                  ? recoveryPin !== pin
                    ? ({
                        borderColor: 'rgb(var(--border-default))',
                        '--tw-ring-color': 'rgb(59, 130, 246)',
                      } as React.CSSProperties)
                    : ({
                        borderColor: '#991B1B',
                        '--tw-ring-color': '#991B1B',
                      } as React.CSSProperties)
                  : ({
                      borderColor: 'rgb(var(--border-default))',
                      '--tw-ring-color': 'rgb(59, 130, 246)',
                    } as React.CSSProperties)
              }
              placeholder="6-8 digits"
            />
            <button
              type="button"
              onClick={() => setShowRecoveryPin(!showRecoveryPin)}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
              aria-label={showRecoveryPin ? 'Hide Recovery PIN' : 'Show Recovery PIN'}
            >
              {showRecoveryPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {recoveryPin && pin && recoveryPin === pin && (
            <p className="text-xs mt-1" style={{ color: '#991B1B' }}>
              Cannot be same as PIN
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-main mb-2">Confirm Recovery PIN *</label>
          <div className="relative">
            <input
              id="confirm-recovery-pin"
              type={showRecoveryPin ? 'text' : 'password'}
              value={confirmRecoveryPin}
              onChange={(e) => setConfirmRecoveryPin(e.target.value)}
              maxLength={8}
              readOnly={formReadOnly}
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-input text-main placeholder-gray-400 ${formReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={
                confirmRecoveryPin
                  ? recoveryPin === confirmRecoveryPin
                    ? ({
                        borderColor: 'rgb(var(--border-default))',
                        '--tw-ring-color': 'rgb(59, 130, 246)',
                      } as React.CSSProperties)
                    : ({
                        borderColor: '#991B1B',
                        '--tw-ring-color': '#991B1B',
                      } as React.CSSProperties)
                  : ({
                      borderColor: 'rgb(var(--border-default))',
                      '--tw-ring-color': 'rgb(59, 130, 246)',
                    } as React.CSSProperties)
              }
              placeholder="6-8 digits"
            />
            <button
              type="button"
              onClick={() => setShowRecoveryPin(!showRecoveryPin)}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
              aria-label={showRecoveryPin ? 'Hide Recovery PIN' : 'Show Recovery PIN'}
            >
              {showRecoveryPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmRecoveryPin && (
            <p
              className="text-xs mt-1"
              style={{
                color: recoveryPin === confirmRecoveryPin ? 'inherit' : '#991B1B',
              }}
            >
              {recoveryPin === confirmRecoveryPin ? '' : 'Recovery PINs do not match'}
            </p>
          )}
        </div>
      </div>

      {/* Security Tips - Collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowSecurityTips(!showSecurityTips)}
          tabIndex={-1}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          aria-expanded={showSecurityTips}
        >
          <Info className="h-4 w-4" />
          <span>Security Tips</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${showSecurityTips ? 'rotate-180' : ''}`}
          />
        </button>

        <div
          className={`
                        overflow-hidden transition-all duration-300 ease-in-out
                        ${showSecurityTips ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'}
                      `}
          aria-hidden={!showSecurityTips}
        >
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: 'rgb(var(--border-default))',
              backgroundColor: 'rgba(var(--info-panel-bg))',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border"
                    style={{
                      backgroundColor: 'rgb(var(--surface-card))',
                      borderColor: 'rgb(var(--border-default))',
                    }}
                  >
                    1
                  </span>
                  <span className="text-sm font-semibold text-heading">PIN for Daily Use</span>
                </div>
                <p className="text-sm text-secondary leading-relaxed">
                  Use your PIN for regular encryption and decryption operations.
                </p>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border"
                    style={{
                      backgroundColor: 'rgb(var(--surface-card))',
                      borderColor: 'rgb(var(--border-default))',
                    }}
                  >
                    2
                  </span>
                  <span className="text-sm font-semibold text-heading">
                    Recovery PIN for Emergencies
                  </span>
                </div>
                <p className="text-sm text-secondary leading-relaxed">
                  Needed only if your PIN is blocked after failed attempts.
                </p>
              </div>
            </div>

            <p
              className="mt-4 border-t pt-3 text-xs text-secondary italic"
              style={{ borderColor: 'rgb(var(--border-default))' }}
            >
              <span className="font-semibold">Security Note:</span> Store both PINs securely in a
              password manager. Keep them separate from your YubiKey.
            </p>
          </div>
        </div>
      </div>

      {/* Touch YubiKey Prompt - Shows when backend reaches WaitingForTouch phase */}
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
          disabled={
            isSetupInProgress ||
            !label.trim() ||
            !pin ||
            !confirmPin ||
            !recoveryPin ||
            !confirmRecoveryPin ||
            pin !== confirmPin ||
            recoveryPin !== confirmRecoveryPin ||
            pin === recoveryPin
          }
          className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
          style={
            !(
              isSetupInProgress ||
              !label.trim() ||
              !pin ||
              !confirmPin ||
              !recoveryPin ||
              !confirmRecoveryPin ||
              pin !== confirmPin ||
              recoveryPin !== confirmRecoveryPin ||
              pin === recoveryPin
            )
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
              Setting up...
            </>
          ) : (
            'Setup YubiKey'
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
