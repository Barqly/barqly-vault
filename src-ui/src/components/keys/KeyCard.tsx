import React, { useState } from 'react';
import { Key, MoreVertical, Link2, FileText } from 'lucide-react';
import { GlobalKey, commands } from '../../bindings';
import { logger } from '../../lib/logger';

interface KeyCardProps {
  keyRef: GlobalKey;
  vaultAttachments: string[];
  isOrphan: boolean;
  isSelected?: boolean;
  onSelect?: (keyId: string) => void;
  onAttach?: (keyId: string) => void;
  onDelete?: (keyId: string) => void;
  onExport?: (keyId: string) => void;
  onRefresh?: () => Promise<void>;
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
  onRefresh,
  vaultNames = new Map(),
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isPassphrase = keyRef.key_type.type === 'Passphrase';
  const isYubiKey = keyRef.key_type.type === 'YubiKey';

  // Get vault names for display
  const attachedVaultNames = vaultAttachments.map((id) => vaultNames.get(id) || id);
  const vaultCount = vaultAttachments.length;

  // Truncate label to 12 characters
  const displayLabel = keyRef.label.length > 12 ? keyRef.label.slice(0, 12) + '...' : keyRef.label;

  // Calculate days remaining for deactivated keys
  const getDaysRemaining = (deactivatedAt: string): number => {
    const now = new Date();
    const deactivated = new Date(deactivatedAt);
    const daysPassed = Math.floor(
      (now.getTime() - deactivated.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 30 - daysPassed);
  };

  // Status badge helper - ONLY show for special states (New or Deactivated)
  const getStatusBadge = () => {
    const { lifecycle_status, deactivated_at } = keyRef;

    // Calculate real countdown for deactivated keys
    const daysRemaining = lifecycle_status === 'deactivated' && deactivated_at
      ? getDaysRemaining(deactivated_at)
      : 0;

    switch (lifecycle_status) {
      case 'pre_activation':
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            New
          </span>
        );
      case 'deactivated':
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
            Deactivated {daysRemaining}d
          </span>
        );
      case 'compromised':
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
            Compromised
          </span>
        );
      // Don't show status badge for active/suspended - Row 3 already shows attachment status
      case 'active':
      case 'suspended':
      default:
        return null;
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDeactivate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    // Confirmation dialog
    if (!confirm('Deactivate this key? You have 30 days to restore it before permanent deletion.')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await commands.deactivateKey({
        key_id: keyRef.id,
        reason: null,
      });

      if (result.status === 'ok') {
        logger.info('KeyCard', 'Key deactivated successfully', {
          keyId: keyRef.id,
          deactivatedAt: result.data.deactivated_at,
          deletionScheduledAt: result.data.deletion_scheduled_at,
        });

        // Refresh key list
        await onRefresh?.();
      } else {
        logger.error('KeyCard', 'Failed to deactivate key', new Error(result.error.message));
        alert(`Failed to deactivate key: ${result.error.message}`);
      }
    } catch (err) {
      logger.error('KeyCard', 'Error deactivating key', err as Error);
      alert('An unexpected error occurred while deactivating the key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    setIsLoading(true);
    try {
      const result = await commands.restoreKey({
        key_id: keyRef.id,
      });

      if (result.status === 'ok') {
        logger.info('KeyCard', 'Key restored successfully', {
          keyId: keyRef.id,
          newStatus: result.data.new_status,
          restoredAt: result.data.restored_at,
        });

        // Refresh key list
        await onRefresh?.();
      } else {
        logger.error('KeyCard', 'Failed to restore key', new Error(result.error.message));
        alert(`Failed to restore key: ${result.error.message}`);
      }
    } catch (err) {
      logger.error('KeyCard', 'Error restoring key', err as Error);
      alert('An unexpected error occurred while restoring the key.');
    } finally {
      setIsLoading(false);
    }
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
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleRestore}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Restoring...' : 'Restore'}
                  </button>
                ) : (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDeactivate}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deactivating...' : 'Deactivate'}
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

        {/* Serial Badge (YubiKey only) */}
        {isYubiKey && keyRef.key_type.type === 'YubiKey' && (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
            S/N: {keyRef.key_type.data.serial}
          </span>
        )}

        {/* Status Badge */}
        {getStatusBadge()}
      </div>

      {/* Row 3: Attachment Status */}
      <div className="px-5 pb-3">
        {vaultCount > 0 ? (
          <span className="text-xs font-medium text-slate-600">
            Attached to:{' '}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAttach?.(keyRef.id);
              }}
              className="text-blue-600 font-medium hover:underline"
            >
              {vaultCount} {vaultCount === 1 ? 'vault' : 'vaults'}
            </button>
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-600">
            Not attached to any vault
          </span>
        )}
      </div>

      {/* Footer: Action Buttons */}
      <div className="flex justify-between px-5 py-3 border-t border-slate-100">
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
