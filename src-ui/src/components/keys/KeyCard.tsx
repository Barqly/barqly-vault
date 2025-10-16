import React, { useState } from 'react';
import { Key, Link2, FileText, Copy, Check, Fingerprint } from 'lucide-react';
import { GlobalKey, VaultStatistics, commands } from '../../bindings';
import { logger } from '../../lib/logger';

interface KeyCardProps {
  keyRef: GlobalKey;
  vaultAttachments: string[];
  isOrphan: boolean;
  vaultStats?: Map<string, VaultStatistics>;
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
  vaultStats,
  isSelected = false,
  onSelect,
  onAttach,
  onDelete,
  onExport,
  onRefresh,
  vaultNames = new Map(),
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isPassphrase = keyRef.key_type.type === 'Passphrase';
  const isYubiKey = keyRef.key_type.type === 'YubiKey';

  /**
   * Determines if a key has been used in ANY encryption envelope
   *
   * A key is considered "used in envelope" if:
   * - It is attached to at least one vault (keyRef.vault_associations)
   * - AND at least one of those vaults has been encrypted (encryption_count > 0)
   *
   * Per spec: Keys used in encryption envelopes cannot be deactivated
   * because they are part of sealed vault data.
   */
  const isKeyUsedInEnvelope = (
    keyRef: GlobalKey,
    vaultStats?: Map<string, VaultStatistics>
  ): boolean => {
    // Early return if no stats available (fail-safe to false)
    if (!vaultStats) {
      return false;
    }

    // Early return if no attachments
    if (keyRef.vault_associations.length === 0) {
      return false;
    }

    // Check each vault this key is attached to
    for (const vaultId of keyRef.vault_associations) {
      const stats = vaultStats.get(vaultId);

      // If we have stats and encryption_count > 0, key is used in envelope
      if (stats && stats.encryption_count > 0) {
        return true;
      }
    }

    // Key is either attached to vaults that were never encrypted,
    // or we don't have stats (fail-safe to false)
    return false;
  };

  // Deactivation eligibility checks
  const usedInEnvelope = isKeyUsedInEnvelope(keyRef, vaultStats);
  const isDeactivated = keyRef.lifecycle_status === 'deactivated';
  const canDeactivate = !isDeactivated && !usedInEnvelope;

  // Tooltip text for deactivation button
  const deactivateTooltip = usedInEnvelope
    ? "This key is part of a vault's encryption envelope and cannot be deactivated."
    : "Deactivate this key. It will be permanently deleted after 30 days unless restored.";

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

  const handleDeactivate = async (e: React.MouseEvent) => {
    e.stopPropagation();

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
        ${isSelected ? 'ring-2 border-2' : 'border-slate-200 hover:shadow-lg'}
      `}
      style={{
        boxShadow: isSelected
          ? `0 0 0 2px ${isPassphrase ? 'rgba(167, 243, 208, 0.5)' : 'rgba(197, 161, 0, 0.5)'}`
          : '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
        borderColor: isSelected ? (isPassphrase ? '#A7F3D0' : '#C5A100') : undefined,
      }}
      onClick={() => onSelect?.(keyRef.id)}
    >
      {/* Row 1: Icon + Label (NO overflow menu) */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2">
        {/* Icon - h-4 w-4 to match VaultAttachmentDialog */}
        <div
          className="rounded-lg p-2 flex-shrink-0"
          style={{
            backgroundColor: isPassphrase ? 'rgba(15, 118, 110, 0.1)' : 'rgba(197, 161, 0, 0.15)',
            border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #E6D8AA',
          }}
        >
          {isPassphrase ? (
            <Key
              className="h-4 w-4"
              style={{
                color: '#0F766E',
              }}
            />
          ) : (
            <Fingerprint
              className="h-4 w-4"
              style={{
                color: '#A16207',
              }}
            />
          )}
        </div>

        {/* Label with tooltip for full text */}
        <h3
          className="font-semibold text-slate-800 truncate"
          title={keyRef.label}
        >
          {displayLabel}
        </h3>
      </div>

      {/* Row 2: Type Badge + Status Badge */}
      <div className="flex items-center justify-between px-5 pt-2">
        {/* Type Badge */}
        <span
          className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
          style={{
            backgroundColor: isPassphrase ? 'rgba(15, 118, 110, 0.1)' : 'rgba(197, 161, 0, 0.15)',
            color: isPassphrase ? '#0F766E' : '#A16207',
            border: `1px solid ${isPassphrase ? '#A7F3D0' : '#E6D8AA'}`,
          }}
        >
          {isPassphrase ? 'Passphrase' : 'YubiKey'}
        </span>

        {/* Status Badge */}
        {getStatusBadge()}
      </div>

      {/* Row 3: Attachment Status + Serial (YubiKey) */}
      <div className="flex items-center justify-between px-5 py-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${vaultCount === 0 ? 'text-slate-500' : 'text-slate-600'}`}>
            Attached to: {vaultCount} {vaultCount === 1 ? 'vault' : 'vaults'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAttach?.(keyRef.id);
            }}
            className="transition-colors"
            style={{ color: '#1D4ED8' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1E40AF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#1D4ED8';
            }}
            title="Manage vault attachments"
          >
            <Link2 className="h-3 w-3" />
          </button>
        </div>

        {/* Serial (YubiKey only) - right-aligned */}
        {isYubiKey && keyRef.key_type.type === 'YubiKey' && (
          <span className="text-xs font-medium text-slate-600">
            S/N: {keyRef.key_type.data.serial}
          </span>
        )}
      </div>

      {/* Row 4: Public Key Info - All Keys */}
      <div className="flex items-center px-5 pt-0 pb-2">
        {/* Public key with copy button */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-medium text-slate-600">Public key:</span>
          <code className="text-xs text-slate-700 font-mono truncate" title={keyRef.recipient}>
            {keyRef.recipient.slice(0, 15)}...
          </code>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(keyRef.recipient);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
            className={`transition-colors ${
              isCopied ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
            }`}
            title={isCopied ? 'Copied!' : 'Copy public key'}
          >
            {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Footer: Action Buttons */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100">
        {/* Left: Deactivate/Restore */}
        {isDeactivated ? (
          <button
            onClick={handleRestore}
            disabled={isLoading}
            className="
              flex items-center justify-center gap-1 px-3 py-1.5
              text-xs font-medium text-white
              rounded-md transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            style={{
              backgroundColor: '#1D4ED8',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#1E40AF';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#1D4ED8';
              }
            }}
            title="Restore this key to active status"
          >
            {isLoading ? 'Restoring...' : 'Restore'}
          </button>
        ) : (
          <button
            onClick={canDeactivate ? handleDeactivate : undefined}
            disabled={isLoading || !canDeactivate}
            className={`
              flex items-center justify-center gap-1 px-3 py-1.5
              text-xs font-medium rounded-md transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${canDeactivate
                ? 'text-slate-600 border border-slate-300 hover:bg-slate-50'
                : 'text-slate-400 border border-slate-300'
              }
            `}
            title={deactivateTooltip}
          >
            {isLoading ? 'Deactivating...' : 'Deactivate'}
          </button>
        )}

        {/* Center: Export (Passphrase only) */}
        {isPassphrase && onExport && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport(keyRef.id);
            }}
            className="
              flex items-center gap-1 px-3 py-1.5
              text-xs font-medium text-slate-600
              border border-slate-200 rounded-md
              hover:bg-slate-50 transition-colors
            "
            title="Download an encrypted backup of this key for recovery"
          >
            <FileText className="h-3 w-3" />
            Export
          </button>
        )}

        {/* Right: Vault button */}
        {onAttach && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAttach(keyRef.id);
            }}
            className="
              flex items-center justify-center gap-1 px-3 py-1.5
              text-xs font-medium text-white
              rounded-md transition-colors
            "
            style={{
              backgroundColor: '#1D4ED8',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1E40AF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            title="Manage vault attachments"
          >
            <Link2 className="h-3 w-3" />
            Vault
          </button>
        )}
      </div>
    </div>
  );
};
