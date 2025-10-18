import React from 'react';
import { X, Key, Fingerprint, Shield } from 'lucide-react';

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePassphrase: () => void;
  onRegisterYubiKey: () => void;
}

/**
 * Modal for selecting key type to create
 * Replaces dropdown menu with larger, clearer selection
 */
export const CreateKeyModal: React.FC<CreateKeyModalProps> = ({
  isOpen,
  onClose,
  onCreatePassphrase,
  onRegisterYubiKey,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-elevated rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <h2 className="text-xl font-semibold text-main">Create New Key</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-secondary transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* YubiKey Card - LEFT (Most Secure) */}
              <button
                onClick={onRegisterYubiKey}
                className="group p-6 pt-8 border-2 border-default rounded-lg transition-all relative bg-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ffd4a3';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 138, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-card))';
                }}
              >
                {/* Most Secure Badge - Centered on top border */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {/* Background to hide border */}
                  <div className="absolute inset-0 bg-elevated rounded-full" style={{ margin: '-2px' }} />
                  {/* Badge */}
                  <div className="relative flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(249, 139, 28, 0.08)', color: '#F98B1C', border: '1px solid #ffd4a3' }}>
                    <Shield className="h-3 w-3" />
                    Most Secure
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: 'rgba(249, 139, 28, 0.08)',
                      border: '1px solid #ffd4a3',
                    }}
                  >
                    <Fingerprint
                      className="h-12 w-12"
                      style={{ color: '#F98B1C' }}
                    />
                  </div>
                  <h4 className="font-semibold" style={{ color: '#334155' }}>
                    YubiKey
                  </h4>
                  <p className="text-sm text-secondary text-center">Hardware security key</p>
                </div>
              </button>

              {/* Passphrase Card - RIGHT */}
              <button
                onClick={onCreatePassphrase}
                className="group p-6 border-2 border-default rounded-lg transition-all bg-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#B7E1DD';
                  e.currentTarget.style.backgroundColor = 'rgba(15, 118, 110, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-card))';
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: 'rgba(15, 118, 110, 0.1)',
                      border: '1px solid #B7E1DD',
                    }}
                  >
                    <Key
                      className="h-12 w-12"
                      style={{ color: '#13897F' }}
                    />
                  </div>
                  <h4 className="font-semibold" style={{ color: '#334155' }}>
                    Passphrase
                  </h4>
                  <p className="text-sm text-secondary text-center">Password-protected key</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
