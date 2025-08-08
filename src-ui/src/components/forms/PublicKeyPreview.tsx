import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PublicKeyPreviewProps {
  publicKey: string;
  showPreview: boolean;
  onTogglePreview: () => void;
  truncateKey: (key: string) => string;
}

export const PublicKeyPreview: React.FC<PublicKeyPreviewProps> = ({
  publicKey,
  showPreview,
  onTogglePreview,
  truncateKey,
}) => {
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Public Key</span>
        <button
          type="button"
          onClick={onTogglePreview}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={showPreview ? 'Hide public key' : 'Show public key'}
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showPreview && (
        <div className="text-xs font-mono text-gray-600 break-all">{truncateKey(publicKey)}</div>
      )}
    </div>
  );
};
