import React, { useState } from 'react';
import { Key, Lock, Upload, Search, Check, X } from 'lucide-react';
import { KeyReference } from '../../bindings';

interface KeyDiscoveryProps {
  availableKeys: KeyReference[];
  suggestedKeys: KeyReference[];
  keyAttempts: Map<string, boolean>;
  onKeySelected: (keyId: string) => void;
  onImportKey: () => void;
  onDetectYubiKey?: () => void;
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
    if (key.type === 'yubikey' && key.state === 'not_inserted') {
      return 'Not inserted';
    }
    return 'Available';
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
          <Key className="w-5 h-5" />
          Select Decryption Key
        </div>
        <p className="text-sm text-blue-700">
          Choose the key that was used to encrypt this vault. If you don't see your key, you can
          import it below.
        </p>
      </div>

      {/* Available keys list */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Available keys on this device:</h4>

        {availableKeys.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
            <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600">No keys found on this device</p>
            <p className="text-sm text-slate-500 mt-1">Import your key to continue</p>
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
                      ? 'bg-blue-50 border-blue-600'
                      : isDisabled
                        ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-60'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {key.type === 'yubikey' ? (
                          <span className="text-lg">🔐</span>
                        ) : (
                          <span className="text-lg">🔑</span>
                        )}
                        <span className="font-medium text-slate-800">{key.label || key.id}</span>
                        {getKeyStatusIcon(key.id)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {key.type === 'passphrase'
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
                            ? 'bg-red-100 text-red-700'
                            : status === 'Suggested'
                              ? 'bg-green-100 text-green-700'
                              : status === 'Not inserted'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  {selectedKeyId === key.id && !isDisabled && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <span className="text-sm text-blue-600 font-medium">Try This Key</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Import options */}
      <div className="pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-600 mb-3">Don't see your key?</p>
        <div className="flex gap-3">
          <button
            onClick={onImportKey}
            className="h-10 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import .enc
          </button>
          {onDetectYubiKey && (
            <button
              onClick={onDetectYubiKey}
              className="h-10 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
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
