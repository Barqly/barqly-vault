import React from 'react';
import { Loader2, AlertTriangle, Copy, Check } from 'lucide-react';
import { YubiKeyStateInfo } from '../../bindings';

interface YubiKeyOrphanedFormProps {
  selectedKey: YubiKeyStateInfo;
  label: string;
  setLabel: (value: string) => void;
  isSetupInProgress: boolean;
  error: string | null;
  isCopied: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onCopyPublicKey: (publicKey: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  firstFocusableRef: React.RefObject<HTMLInputElement | null>;
  lastFocusableRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Form for ORPHANED YubiKeys (Scenario 4)
 * Already has encryption key - just needs to be added to registry
 * No PIN or touch required
 */
export const YubiKeyOrphanedForm: React.FC<YubiKeyOrphanedFormProps> = ({
  selectedKey,
  label,
  setLabel,
  isSetupInProgress,
  error,
  isCopied,
  onSubmit,
  onCancel,
  onCopyPublicKey,
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

      {/* Public Key with Copy Box */}
      {selectedKey.recipient && (
        <div>
          <label className="block text-sm font-medium text-main mb-2">Public Key:</label>
          <div
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{
              borderColor: 'rgba(59, 130, 246, 0.3)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            }}
          >
            <p className="flex-1 font-mono text-sm text-main truncate">{selectedKey.recipient}</p>
            <button
              onClick={() => onCopyPublicKey(selectedKey.recipient!)}
              className="flex-shrink-0 p-1.5 rounded transition-colors"
              style={{ color: 'rgb(var(--text-muted))' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.color = 'rgb(var(--text-secondary))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgb(var(--text-muted))';
              }}
              aria-label="Copy public key"
              title="Copy public key"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* YubiKey Label */}
      <div>
        <label className="block text-sm font-medium text-main mb-2">YubiKey Label *</label>
        <input
          id="yubikey-label-orphaned"
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

      {/* Buttons with Premium Blue */}
      <div className="flex gap-3">
        <button
          ref={lastFocusableRef}
          onClick={onSubmit}
          disabled={isSetupInProgress || !label.trim()}
          className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
          style={
            !(isSetupInProgress || !label.trim())
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
              Adding...
            </>
          ) : (
            'Add to Registry'
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
