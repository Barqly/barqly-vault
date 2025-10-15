import React from 'react';
import { Key, MoreVertical, Link2, FileText, Trash2 } from 'lucide-react';
import { KeyReference } from '../../bindings';

interface KeyCardProps {
  keyRef: KeyReference;
  vaultAttachments: string[];
  isOrphan: boolean;
  isSelected?: boolean;
  onSelect?: (keyId: string) => void;
  onAttach?: (keyId: string) => void;
  onDelete?: (keyId: string) => void;
  onExport?: (keyId: string) => void;
  vaultNames?: Map<string, string>;
}

export const KeyCard: React.FC<KeyCardProps> = ({
  keyRef,
  vaultAttachments,
  isOrphan,
  isSelected = false,
  onSelect,
  onAttach,
  onDelete,
  onExport,
  vaultNames = new Map(),
}) => {
  const isPassphrase = keyRef.type === 'Passphrase';
  const isYubiKey = keyRef.type === 'YubiKey';

  // Get vault names for display
  const attachedVaultNames = vaultAttachments.map((id) => vaultNames.get(id) || id);

  return (
    <div
      className={`
        relative rounded-lg border bg-white transition-all
        ${isSelected ? 'ring-2 ring-blue-600 border-blue-600' : 'border-slate-200 hover:shadow-lg'}
        ${isOrphan ? 'border-orange-300 bg-orange-50' : ''}
      `}
      onClick={() => onSelect?.(keyRef.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div
            className={`
              rounded-lg p-2
              ${isPassphrase ? 'bg-green-100' : 'bg-purple-100'}
            `}
          >
            <Key className={`h-5 w-5 ${isPassphrase ? 'text-green-700' : 'text-purple-700'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{keyRef.label}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`
                  inline-flex px-2 py-0.5 text-xs font-medium rounded-full
                  ${isPassphrase ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}
                `}
              >
                {isPassphrase ? 'Passphrase' : 'YubiKey'}
              </span>
            </div>
          </div>
        </div>
        <button
          className="p-1 hover:bg-slate-100 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Show dropdown menu
          }}
        >
          <MoreVertical className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Attachments */}
      <div className="px-5 pb-3 space-y-2">
        <div className="text-sm">
          <span className="text-slate-500">Attached to:</span>{' '}
          {attachedVaultNames.length > 0 && (
            <span className="font-medium text-slate-700">{attachedVaultNames.join(', ')}</span>
          )}
        </div>

        {isYubiKey && keyRef.type === 'YubiKey' && (
          <div className="text-sm text-slate-500">Serial: {keyRef.data.serial}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 pb-5 pt-2 border-t border-slate-100">
        {onAttach && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAttach(keyRef.id);
            }}
            className="
              flex items-center justify-center gap-1 px-2 py-1.5 w-24
              text-xs font-medium text-blue-600 border border-blue-600
              rounded-md hover:bg-blue-50 transition-colors
            "
          >
            <Link2 className="h-3 w-3" />
            Vault
          </button>
        )}

        {onExport && isPassphrase && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport(keyRef.id);
            }}
            className="
              flex items-center justify-center gap-1 px-2 py-1.5 w-24
              text-xs font-medium text-slate-600 border border-slate-200
              rounded-md hover:bg-slate-50 transition-colors
            "
            title="Download an encrypted backup of this key for recovery."
          >
            <FileText className="h-3 w-3" />
            Export
          </button>
        )}

        {isOrphan && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(keyRef.id);
            }}
            className="
              flex items-center justify-center gap-1 px-2 py-1.5 w-24
              text-xs font-medium text-red-600 border border-red-200
              rounded-md hover:bg-red-50 transition-colors
            "
            title={
              isPassphrase
                ? 'Mark key for deletion. 30-day grace period before encrypted key is permanently removed.'
                : 'Mark YubiKey as inactive. Device unchanged. Record removed after 30 days.'
            }
          >
            <Trash2 className="h-3 w-3" />
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
};
