import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '../../lib/logger';

interface YubiKeyInfo {
  serial: string;
  slot: number;
  identity: string;
}

interface YubiKeyDetectorProps {
  onAddToRegistry: (yubikey: YubiKeyInfo) => Promise<void>;
  onCancel: () => void;
}

export const YubiKeyDetector: React.FC<YubiKeyDetectorProps> = ({ onAddToRegistry, onCancel }) => {
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectedKey, setDetectedKey] = useState<YubiKeyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let mounted = true;

    const detectYubiKey = async () => {
      try {
        // Use actual backend command to list YubiKeys
        const { commands } = await import('../../bindings');
        const result = await commands.listYubikeys();

        if (!mounted) return;

        if (result.status === 'ok' && result.data && result.data.length > 0) {
          // Get the first detected YubiKey
          const yubikey = result.data[0];
          setDetectedKey({
            serial: yubikey.serial,
            slot: yubikey.slot || 1,
            identity: yubikey.identity_tag || yubikey.recipient || 'Unknown',
          });
          setIsDetecting(false);
        } else {
          setError('No YubiKey detected. Please insert your YubiKey and try again.');
          setIsDetecting(false);
        }
      } catch (err) {
        if (!mounted) return;
        logger.error('YubiKeyDetector', 'Failed to detect YubiKey', err as Error);
        setError('No YubiKey detected. Please insert your YubiKey and try again.');
        setIsDetecting(false);
      }
    };

    detectYubiKey();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAddToRegistry = async () => {
    if (!detectedKey) return;

    setIsAdding(true);
    setError(null);

    try {
      await onAddToRegistry(detectedKey);
      onCancel(); // Close detector on success
    } catch (err) {
      logger.error('YubiKeyDetector', 'Failed to add YubiKey', err as Error);
      setError((err as Error).message || 'Failed to add YubiKey to registry');
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-purple-100 p-2">
          <Key className="h-5 w-5 text-purple-700" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">YubiKey Detection</h3>
      </div>

      {isDetecting && (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-600">Detecting YubiKey...</p>
          <p className="text-xs text-slate-500">Please insert your YubiKey</p>
        </div>
      )}

      {!isDetecting && detectedKey && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-medium text-green-800">YubiKey Detected</p>
              <div className="space-y-1 text-sm text-slate-700">
                <div>
                  <span className="text-slate-500">Serial:</span>{' '}
                  <span className="font-mono">{detectedKey.serial}</span>
                </div>
                <div>
                  <span className="text-slate-500">Slot:</span>{' '}
                  <span className="font-mono">{detectedKey.slot}</span>
                </div>
                <div className="break-all">
                  <span className="text-slate-500">Identity:</span>{' '}
                  <code className="text-xs bg-white px-1 py-0.5 rounded">
                    {detectedKey.identity}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="
                flex-1 px-4 py-2 text-sm font-medium text-slate-600
                border border-slate-200 rounded-lg
                hover:bg-slate-50 transition-colors
              "
            >
              Cancel
            </button>
            <button
              onClick={handleAddToRegistry}
              disabled={isAdding}
              className="
                flex-1 px-4 py-2 text-sm font-medium
                border rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white bg-blue-600 border-blue-600
                hover:bg-blue-700 hover:border-blue-700
              "
            >
              {isAdding ? 'Adding...' : 'Add to Registry'}
            </button>
          </div>
        </div>
      )}

      {!isDetecting && error && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Detection Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="
                flex-1 px-4 py-2 text-sm font-medium text-slate-600
                border border-slate-200 rounded-lg
                hover:bg-slate-50 transition-colors
              "
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsDetecting(true);
                setError(null);
                // Re-trigger detection
                window.location.reload();
              }}
              className="
                flex-1 px-4 py-2 text-sm font-medium
                border rounded-lg transition-colors
                text-blue-600 border-blue-600
                hover:bg-blue-50
              "
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
