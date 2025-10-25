import React, { useState } from 'react';
import { Key, Lock, Upload, Search, Check, X, ShieldAlert } from 'lucide-react';
import { VaultKey } from '../../bindings';

// KeyReference is VaultKey (for backward compatibility)
type KeyReference = VaultKey;

interface KeyDiscoveryProps {
  availableKeys: KeyReference[];
  suggestedKeys: KeyReference[];
  keyAttempts: Map<string, boolean>;
  onKeySelected: (keyId: string) => void;
  onImportKey: () => void;
  onDetectYubiKey?: () => void;
  isRecoveryMode?: boolean; // NEW: Indicates vault manifest is missing
}

/**
 * Component for key discovery during unknown vault decryption
 * Helps users find the right key or import missing ones
 */
const KeyDiscovery: React.FC<KeyDiscoveryProps> = ({
  availableKeys,
  suggestedKeys,
  keyAttempts,
  onKeySelected,
  onImportKey,
  onDetectYubiKey,
  isRecoveryMode = false,
}) => {
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  const handleKeySelect = (keyId: string) => {
    setSelectedKeyId(keyId);
    onKeySelected(keyId);
  };

  const getKeyStatusIcon = (keyId: string) => {
    if (keyAttempts.has(keyId)) {
      return <X className="w-4 h-4 text-red-500" />;
    }
    if (suggestedKeys.some((k) => k.id === keyId)) {
      return <Check className="w-4 h-4 text-green-500" />;
    }
    return null;
  };

  const getKeyStatus = (key: KeyReference) => {
    if (keyAttempts.has(key.id)) {
      return 'Failed';
    }
    if (suggestedKeys.some((k) => k.id === key.id)) {
      return 'Suggested';
    }
    // Check lifecycle status for YubiKey availability
    if (
      key.type === 'YubiKey' &&
      (key.lifecycle_status === 'suspended' || key.lifecycle_status === 'deactivated')
    ) {
      return 'Not available';
    }
    return 'Available';
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${
        isRecoveryMode
          ? 'bg-slate-50 dark:bg-slate-800 border-orange-200 dark:border-orange-700/50'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
      }`}>
        <div className={`flex items-center gap-2 font-medium mb-2 ${
          isRecoveryMode
            ? 'text-orange-800 dark:text-orange-300'
            : 'text-blue-800 dark:text-blue-300'
        }`}>
          {isRecoveryMode ? (
            <ShieldAlert className="w-5 h-5" />
          ) : (
            <Key className="w-5 h-5" />
          )}
          {isRecoveryMode ? 'Recovery Mode' : 'Select Decryption Key'}
        </div>
        <p className={`text-sm ${
          isRecoveryMode
            ? 'text-slate-600 dark:text-slate-400'
            : 'text-blue-700 dark:text-blue-400'
        }`}>
          {isRecoveryMode
            ? "This vault's manifest is missing. Select or import the key that was used to encrypt this vault."
            : 'Choose the key that was used to encrypt this vault. If you don\'t see your key, you can import it below.'}
        </p>
      </div>

      {/* Available keys list */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Available keys on this device:</h4>

        {availableKeys.length === 0 ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-center">
            <Lock className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-300">No keys found on this device</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Import your key to continue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableKeys.map((key) => {
              const status = getKeyStatus(key);
              const isDisabled = keyAttempts.has(key.id);

              return (
                <button
                  key={key.id}
                  onClick={() => !isDisabled && handleKeySelect(key.id)}
                  disabled={isDisabled}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    selectedKeyId === key.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-600 dark:border-blue-500'
                      : isDisabled
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 cursor-not-allowed opacity-60'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {key.type === 'YubiKey' ? (
                          <span className="text-lg">🔐</span>
                        ) : (
                          <span className="text-lg">🔑</span>
                        )}
                        <span className="font-medium text-slate-800 dark:text-slate-200">{key.label || key.id}</span>
                        {getKeyStatusIcon(key.id)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {key.type === 'Passphrase'
                          ? 'Passphrase'
                          : `YubiKey - Slot ${(key as any).slot || 1}`}
                        {key.created_at &&
                          ` • Created ${new Date(key.created_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          status === 'Failed'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : status === 'Suggested'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : status === 'Not available'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  {selectedKeyId === key.id && !isDisabled && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Try This Key</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Import options */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Don't see your key?</p>
        <div className="flex gap-3">
          <button
            onClick={onImportKey}
            className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import .enc
          </button>
          {onDetectYubiKey && (
            <button
              onClick={onDetectYubiKey}
              className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Detect YubiKey
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyDiscovery;
