import React, { useState } from 'react';
import { Key, MoreVertical, Link2, FileText } from 'lucide-react';
import { GlobalKey } from '../../bindings';

interface KeyCardProps {
  keyRef: GlobalKey;
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
  const [showMenu, setShowMenu] = useState(false);
  const isPassphrase = keyRef.key_type.type === 'Passphrase';
  const isYubiKey = keyRef.key_type.type === 'YubiKey';

  // Get vault names for display
  const attachedVaultNames = vaultAttachments.map((id) => vaultNames.get(id) || id);
  const vaultCount = vaultAttachments.length;

  // Truncate label to 12 characters
  const displayLabel = keyRef.label.length > 12 ? keyRef.label.slice(0, 12) + '...' : keyRef.label;

  // Status badge helper
  const getStatusBadge = () => {
    const { lifecycle_status } = keyRef;

    // Mock deactivation countdown (will use real deactivated_at once backend ready)
    const isDeactivated = lifecycle_status === 'deactivated';
    const daysRemaining = 28; // Mock value - will calculate from deactivated_at

    switch (lifecycle_status) {
      case 'pre_activation':
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            New
          </span>
        );
      case 'active':
        return vaultCount > 0 ? (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
            Attached
          </span>
        ) : null;
      case 'suspended':
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            Unattached
          </span>
        );
      case 'deactivated':
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
            Deactivated {daysRemaining}d
          </span>
        );
      case 'compromised':
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
            Compromised
          </span>
        );
      default:
        return null;
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDeactivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete?.(keyRef.id);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    // TODO: Call restore API once backend ready
    console.log('Restore key:', keyRef.id);
  };

  return (
    <div
      className={`
        relative rounded-lg border bg-white transition-all
        ${isSelected ? 'ring-2 ring-blue-600 border-blue-600' : 'border-slate-200 hover:shadow-lg'}
      `}
      onClick={() => onSelect?.(keyRef.id)}
    >
      {/* Row 1: Icon + Label + Menu */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon - h-4 w-4 to match VaultAttachmentDialog */}
          <div
            className={`
              rounded-lg p-2 flex-shrink-0
              ${isPassphrase ? 'bg-green-100' : 'bg-purple-100'}
            `}
          >
            <Key className={`h-4 w-4 ${isPassphrase ? 'text-green-700' : 'text-purple-700'}`} />
          </div>

          {/* Label with tooltip for full text */}
          <h3
            className="font-semibold text-slate-800 truncate"
            title={keyRef.label}
          >
            {displayLabel}
          </h3>
        </div>

        {/* 3-dot menu */}
        <div className="relative flex-shrink-0">
          <button
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            onClick={handleMenuClick}
            title="More actions"
          >
            <MoreVertical className="h-4 w-4 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                {keyRef.lifecycle_status === 'deactivated' ? (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={handleRestore}
                    disabled={true}
                    title="API not ready yet"
                  >
                    Restore (pending API)
                  </button>
                ) : (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={handleDeactivate}
                    disabled={true}
                    title="API not ready yet"
                  >
                    Deactivate (pending API)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Type Badge + Serial + Status Badge */}
      <div className="flex items-center gap-2 px-5 pb-2">
        {/* Type Badge */}
        <span
          className={`
            inline-flex px-2 py-0.5 text-xs font-medium rounded-full
            ${isPassphrase ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}
          `}
        >
          {isPassphrase ? 'Passphrase' : 'YubiKey'}
        </span>

        {/* Serial (YubiKey only) */}
        {isYubiKey && keyRef.key_type.type === 'YubiKey' && (
          <span className="text-xs text-slate-500">
            Serial: {keyRef.key_type.data.serial}
          </span>
        )}

        {/* Status Badge */}
        {getStatusBadge()}
      </div>

      {/* Row 3: Attachment Status */}
      <div className="px-5 pb-3">
        {vaultCount > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAttach?.(keyRef.id);
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Attached to: {vaultCount} {vaultCount === 1 ? 'vault' : 'vaults'}
          </button>
        ) : (
          <span className="text-sm text-amber-600">
            Not attached to any vault
          </span>
        )}
      </div>

      {/* Footer: Action Buttons */}
      <div className="flex justify-between px-5 pb-5 pt-2 border-t border-slate-100">
        {onExport && isPassphrase ? (
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
        ) : (
          <div />
        )}

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
      </div>
    </div>
  );
};
