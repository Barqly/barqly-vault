import React, { useState } from 'react';
import {
  Key,
  Link2,
  FileText,
  Copy,
  Check,
  Fingerprint,
  Clock,
  Sparkles,
  AlertTriangle,
  Pencil,
  Users,
} from 'lucide-react';
import { GlobalKey, VaultStatistics, commands } from '../../bindings';
import { logger } from '../../lib/logger';
import { DeactivateKeyModal } from './DeactivateKeyModal';
import { DeleteKeyModal } from './DeleteKeyModal';

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
  onEditLabel?: (keyId: string, currentLabel: string) => void;
  onRefresh?: () => Promise<void>;
}

export const KeyCard: React.FC<KeyCardProps> = ({
  keyRef,
  vaultAttachments,
  isOrphan: _isOrphan,
  vaultStats,
  isSelected = false,
  onSelect,
  onAttach,
  onDelete: _onDelete,
  onExport,
  onEditLabel,
  onRefresh,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isPassphrase = keyRef.key_type.type === 'Passphrase';
  const isYubiKey = keyRef.key_type.type === 'YubiKey';
  const isRecipient = keyRef.key_type.type === 'Recipient';

  // Can edit label ONLY if key is not attached to any vault
  const canEditLabel = keyRef.vault_associations.length === 0;

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
    vaultStats?: Map<string, VaultStatistics>,
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
    : 'Deactivate this key. It will be permanently deleted after 30 days unless restored.';

  // Get vault count for display
  const vaultCount = vaultAttachments.length;
  const isUnattached = vaultCount === 0;

  // Truncate label to 24 characters
  const displayLabel = keyRef.label.length > 24 ? keyRef.label.slice(0, 24) + '...' : keyRef.label;

  // Calculate days remaining for deactivated keys
  const getDaysRemaining = (deactivatedAt: string): number => {
    const now = new Date();
    const deactivated = new Date(deactivatedAt);
    const daysPassed = Math.floor((now.getTime() - deactivated.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  // Status badge helper
  const getStatusBadge = () => {
    const { lifecycle_status, deactivated_at } = keyRef;

    // Calculate real countdown for deactivated keys
    const daysRemaining =
      lifecycle_status === 'deactivated' && deactivated_at ? getDaysRemaining(deactivated_at) : 0;

    switch (lifecycle_status) {
      case 'pre_activation':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: 'rgb(var(--status-new-bg))',
              color: 'rgb(var(--status-new-text))',
              border: '1px solid rgb(var(--status-new-border))',
            }}
          >
            <Sparkles className="h-3 w-3" />
            New
          </span>
        );
      case 'active':
        // Show Active badge if key is attached to vaults
        return vaultCount > 0 ? (
          <span
            className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: 'rgba(15, 118, 110, 0.1)',
              color: '#13897F',
              border: '1px solid #99F6E4',
            }}
          >
            Active
          </span>
        ) : null;
      case 'suspended':
        // Don't show badge for suspended - Row 3 shows "Attached to: 0 vaults"
        return null;
      case 'deactivated':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: 'rgba(185, 28, 28, 0.1)',
              color: '#B91C1C',
              border: '1px solid #FCA5A5',
            }}
          >
            <Clock className="h-3 w-3" />
            Inactive {daysRemaining}d
          </span>
        );
      case 'compromised':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: 'rgba(185, 28, 28, 0.15)',
              color: '#991B1B',
              border: '1px solid #FCA5A5',
            }}
          >
            <AlertTriangle className="h-3 w-3" />
            Compromised
          </span>
        );
      default:
        return null;
    }
  };

  const handleDeactivateOrDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnattached) {
      setShowDeleteModal(true);
    } else {
      setShowDeactivateModal(true);
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
        relative rounded-lg border bg-card transition-all
        ${isSelected ? 'ring-2 border-2' : 'border-default hover:shadow-lg'}
      `}
      style={{
        boxShadow: isSelected
          ? `0 0 0 2px ${isRecipient ? 'rgba(124, 58, 237, 0.5)' : isPassphrase ? 'rgba(167, 243, 208, 0.5)' : 'rgba(255, 138, 0, 0.5)'}`
          : '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
        borderColor: isSelected
          ? isRecipient
            ? '#7C3AED'
            : isPassphrase
              ? '#A7F3D0'
              : '#ff8a00'
          : undefined,
      }}
      onClick={() => onSelect?.(keyRef.id)}
    >
      {/* Row 1: Icon + Label (NO overflow menu) */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2">
        {/* Icon - h-4 w-4 to match VaultAttachmentDialog */}
        <div
          className={
            isRecipient
              ? 'rounded-lg p-2 flex-shrink-0 pill-recipient'
              : 'rounded-lg p-2 flex-shrink-0'
          }
          style={
            isRecipient
              ? undefined
              : {
                  backgroundColor: isPassphrase
                    ? 'rgba(15, 118, 110, 0.1)'
                    : 'rgba(249, 139, 28, 0.08)',
                  border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #ffd4a3',
                }
          }
        >
          {isRecipient ? (
            <Users className="h-4 w-4" />
          ) : isPassphrase ? (
            <Key
              className="h-4 w-4"
              style={{
                color: '#13897F',
              }}
            />
          ) : (
            <Fingerprint
              className="h-4 w-4"
              style={{
                color: '#F98B1C',
              }}
            />
          )}
        </div>

        {/* Label with tooltip for full text */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="font-semibold text-heading truncate" title={keyRef.label}>
            {displayLabel}
          </h3>
          {/* Edit icon - Only for non-Active keys */}
          {canEditLabel && onEditLabel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditLabel(keyRef.id, keyRef.label);
              }}
              className="flex-shrink-0 transition-colors"
              style={{ color: 'rgb(var(--text-muted))' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isRecipient
                  ? '#7C3AED'
                  : isPassphrase
                    ? '#13897F'
                    : '#F98B1C';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgb(var(--text-muted))';
              }}
              title="Edit key label"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Type Badge + Status Badge */}
      <div className="flex items-center justify-between px-5 py-2">
        {/* Type Badge */}
        <span
          className={
            isRecipient
              ? 'inline-flex px-2 py-0.5 text-xs font-medium rounded-full pill-recipient'
              : 'inline-flex px-2 py-0.5 text-xs font-medium rounded-full'
          }
          style={
            isRecipient
              ? undefined
              : {
                  backgroundColor: isPassphrase
                    ? 'rgba(15, 118, 110, 0.1)'
                    : 'rgba(249, 139, 28, 0.08)',
                  color: isPassphrase ? '#13897F' : '#F98B1C',
                  border: `1px solid ${isPassphrase ? '#B7E1DD' : '#ffd4a3'}`,
                }
          }
        >
          {isRecipient ? 'Recipient' : isPassphrase ? 'Passphrase' : 'YubiKey'}
        </span>

        {/* Status Badge */}
        {getStatusBadge()}
      </div>

      {/* Row 3: Attachment Status + Serial (YubiKey) */}
      <div className="flex items-center justify-between px-5 pt-2 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-secondary">
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
          <span className="text-xs font-medium text-secondary">
            S/N: {keyRef.key_type.data.serial}
          </span>
        )}
      </div>

      {/* Row 4: Public Key Info - All Keys */}
      <div className="flex items-center px-5 pt-0 pb-2">
        {/* Public key with copy button */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-medium text-secondary">Public Key:</span>
          <code className="text-xs text-main font-mono truncate" title={keyRef.recipient}>
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
              isCopied ? 'text-green-600' : 'text-muted hover:text-secondary'
            }`}
            title={isCopied ? 'Copied!' : 'Copy public key'}
          >
            {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Footer: Action Buttons */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-subtle">
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
            onClick={canDeactivate ? handleDeactivateOrDelete : undefined}
            disabled={isLoading || !canDeactivate}
            className={`
              flex items-center justify-center gap-1 px-3 py-1.5
              text-xs font-medium rounded-md transition-all border
              disabled:opacity-50
              ${canDeactivate ? 'cursor-pointer' : 'cursor-default'}
            `}
            style={{
              borderColor: canDeactivate
                ? 'rgb(var(--border-default))'
                : 'rgb(var(--border-default))',
              color: canDeactivate ? 'rgb(var(--text-secondary))' : 'rgb(var(--text-muted))',
            }}
            onMouseEnter={(e) => {
              if (canDeactivate && !isLoading) {
                e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                e.currentTarget.style.color = 'rgb(var(--heading-primary))';
                e.currentTarget.style.borderColor = 'rgb(var(--border-strong))';
              }
            }}
            onMouseLeave={(e) => {
              if (canDeactivate && !isLoading) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgb(var(--text-secondary))';
                e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
              }
            }}
            title={isUnattached ? 'Delete this unused key permanently' : deactivateTooltip}
          >
            {isLoading
              ? isUnattached
                ? 'Deleting...'
                : 'Deactivating...'
              : isUnattached
                ? 'Delete'
                : 'Deactivate'}
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
              text-xs font-medium
              border rounded-md
              transition-all cursor-pointer
            "
            style={{
              borderColor: 'rgb(var(--border-default))',
              color: 'rgb(var(--text-secondary))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
              e.currentTarget.style.color = 'rgb(var(--heading-primary))';
              e.currentTarget.style.borderColor = 'rgb(var(--border-strong))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgb(var(--text-secondary))';
              e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
            }}
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

      {/* Deactivate Modal (for attached keys) */}
      <DeactivateKeyModal
        isOpen={showDeactivateModal}
        keyRef={keyRef}
        vaultCount={vaultCount}
        onClose={() => setShowDeactivateModal(false)}
        onSuccess={async () => {
          setShowDeactivateModal(false);
          await onRefresh?.();
        }}
      />

      {/* Delete Modal (for unattached keys) */}
      <DeleteKeyModal
        isOpen={showDeleteModal}
        keyRef={keyRef}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={async () => {
          setShowDeleteModal(false);
          await onRefresh?.();
        }}
      />
    </div>
  );
};
