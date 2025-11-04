import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { YubiKeyStateInfo } from '../../bindings';
import { getYubiKeyBadge, getYubiKeyDescription } from './yubikey-helpers';

interface YubiKeyDetectionStepProps {
  isLoading: boolean;
  yubikeys: YubiKeyStateInfo[];
  selectedKey: YubiKeyStateInfo | null;
  error: string | null;
  onRefresh: () => void;
  onCancel: () => void;
  onSelectKey: (yubikey: YubiKeyStateInfo) => void;
  refreshButtonRef: React.RefObject<HTMLButtonElement | null>;
  firstYubiKeyButtonRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Detection step for YubiKey registration
 * Shows loading state, no devices message, or list of available YubiKeys
 */
export const YubiKeyDetectionStep: React.FC<YubiKeyDetectionStepProps> = ({
  isLoading,
  yubikeys,
  selectedKey,
  error,
  onRefresh,
  onCancel,
  onSelectKey,
  refreshButtonRef,
  firstYubiKeyButtonRef,
}) => {
  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : yubikeys.length === 0 ? (
        <>
          {/* Info Panel - Theme-aware */}
          <div
            className="border rounded-lg p-4"
            style={{
              backgroundColor: error ? 'rgb(var(--surface-hover))' : 'rgba(234, 179, 8, 0.1)',
              borderColor: error ? 'rgb(var(--border-default))' : 'rgba(234, 179, 8, 0.3)',
            }}
          >
            <div className="flex gap-3">
              <AlertCircle
                className="h-5 w-5 flex-shrink-0 mt-0.5"
                style={{
                  color: error ? 'rgb(var(--text-secondary))' : '#D97706',
                }}
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{
                    color: error ? 'rgb(var(--text-primary))' : '#B45309',
                  }}
                >
                  {error || 'No YubiKeys available for registration'}
                </p>
                {!error && (
                  <p
                    className="text-sm mt-1"
                    style={{
                      color: '#B45309',
                    }}
                  >
                    Insert your YubiKey to add it to the registry. The green light should be
                    blinking.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Buttons - Refresh spans, Cancel compact */}
          <div
            className="flex gap-3"
            onKeyDown={(e) => {
              // Focus trap for detect step - Tab stays on Refresh button
              if (e.key === 'Tab') {
                e.preventDefault();
                refreshButtonRef.current?.focus();
              }
            }}
          >
            <button
              ref={refreshButtonRef}
              onClick={onRefresh}
              autoFocus
              className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
              style={{
                backgroundColor: '#1D4ED8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1E40AF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1D4ED8';
              }}
            >
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Refresh
            </button>
            <button
              onClick={onCancel}
              tabIndex={-1}
              className="px-4 py-2 border rounded-lg transition-colors"
              style={{
                borderColor: 'rgb(var(--border-default))',
                color: 'rgb(var(--text-secondary))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                e.currentTarget.style.color = 'rgb(var(--text-primary))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgb(var(--text-secondary))';
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-secondary">Select a YubiKey to add to the registry:</p>
          <div className="space-y-2">
            {yubikeys.map((yk, index) => (
              <button
                key={yk.serial}
                ref={index === 0 ? firstYubiKeyButtonRef : null}
                onClick={() => onSelectKey(yk)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSelectKey(yk);
                  }
                }}
                className="w-full p-3 border rounded-lg text-left transition-colors"
                style={{
                  borderColor:
                    selectedKey?.serial === yk.serial ? '#3B82F6' : 'rgb(var(--border-default))',
                  backgroundColor:
                    selectedKey?.serial === yk.serial ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.borderColor = '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  if (selectedKey?.serial !== yk.serial) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-main">YubiKey {yk.serial.substring(0, 8)}</p>
                    <p className="text-xs text-secondary">{getYubiKeyDescription(yk.state)}</p>
                  </div>
                  {(() => {
                    const badge = getYubiKeyBadge(yk.state);
                    return (
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${badge.bgClass} ${badge.textClass}`}
                        style={badge.customStyle}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
