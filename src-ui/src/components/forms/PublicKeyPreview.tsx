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
    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Public Key</span>
        <button
          type="button"
          onClick={onTogglePreview}
          className="text-slate-500 hover:text-slate-700 transition-colors"
          aria-label={showPreview ? 'Hide public key' : 'Show public key'}
          tabIndex={-1}
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showPreview && (
        <div className="text-xs font-mono text-slate-700 break-all">{truncateKey(publicKey)}</div>
      )}
    </div>
  );
};
