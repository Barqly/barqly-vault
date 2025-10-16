import React from 'react';
import { X, Key, Fingerprint } from 'lucide-react';

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
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Create New Key</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Passphrase Card */}
              <button
                onClick={() => {
                  onClose();
                  onCreatePassphrase();
                }}
                className="group p-6 border-2 border-slate-200 rounded-lg transition-all"
                style={{
                  borderColor: undefined,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#B7E1DD';
                  e.currentTarget.style.backgroundColor = 'rgba(15, 118, 110, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = 'transparent';
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
                      style={{ color: '#0F766E' }}
                    />
                  </div>
                  <h4 className="font-semibold text-slate-700" style={{ color: '#334155' }}>
                    Passphrase
                  </h4>
                  <p className="text-sm text-slate-500 text-center">Password-protected key</p>
                </div>
              </button>

              {/* YubiKey Card */}
              <button
                onClick={() => {
                  onClose();
                  onRegisterYubiKey();
                }}
                className="group p-6 border-2 border-slate-200 rounded-lg transition-all"
                style={{
                  borderColor: undefined,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#E6D8AA';
                  e.currentTarget.style.backgroundColor = 'rgba(197, 161, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: 'rgba(197, 161, 0, 0.15)',
                      border: '1px solid #E6D8AA',
                    }}
                  >
                    <Fingerprint
                      className="h-12 w-12"
                      style={{ color: '#A16207' }}
                    />
                  </div>
                  <h4 className="font-semibold text-slate-700" style={{ color: '#334155' }}>
                    YubiKey
                  </h4>
                  <p className="text-sm text-slate-500 text-center">Hardware security key</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
