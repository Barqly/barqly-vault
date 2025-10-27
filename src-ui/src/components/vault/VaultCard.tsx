import React, { useEffect, useState } from 'react';
import { Archive, Key, FlipHorizontal, Clock, HardDrive, Files, Fingerprint } from 'lucide-react';
import { VaultSummary, VaultKey, VaultStatistics, commands } from '../../bindings';
import { isPassphraseKey, isYubiKey } from '../../lib/key-types';
import { formatBytes, formatFileCount } from '../../lib/format-utils';
import KeyAttachmentDialog from './KeyAttachmentDialog';

interface VaultCardProps {
  vault: VaultSummary;
  keys: VaultKey[];
  isActive: boolean;
  isDropTarget?: boolean;
  statistics?: VaultStatistics | null; // Optional prop for cached statistics
  onSelect: () => void;
  onManageKeys: () => void;
  onDelete: () => void;
  onKeyDrop?: (keyId: string) => void;
  onKeysUpdated?: () => void; // Callback when keys are attached/detached
}

/**
 * VaultCard Component - R2 Phase 3 Visual Design
 *
 * Visual vault card with:
 * - Vault icon and metadata
 * - Key badges (passphrase green, YubiKey purple)
 * - Quick actions (Encrypt, Manage Keys, Delete)
 * - Active vault indicator (blue border)
 * - Drag & drop support for key attachment
 */
const VaultCard: React.FC<VaultCardProps> = ({
  vault,
  keys,
  isActive,
  isDropTarget,
  statistics: propStatistics, // Receive statistics as prop
  onSelect,
  onManageKeys: _onManageKeys,
  onDelete,
  onKeyDrop,
  onKeysUpdated,
}) => {
  const [localStatistics, setLocalStatistics] = useState<VaultStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);

  // Use prop statistics if provided, otherwise fetch locally
  const statistics = propStatistics !== undefined ? propStatistics : localStatistics;

  // Load vault statistics only if not provided as prop
  useEffect(() => {
    // If statistics are provided as prop, don't fetch
    if (propStatistics !== undefined) {
      return;
    }

    const loadStatistics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use vault.id for the API
        const result = await commands.getVaultStatistics({
          vault_id: vault.id,
        });

        if (result.status === 'ok' && result.data.success && result.data.statistics) {
          setLocalStatistics(result.data.statistics);
        } else if (result.status === 'error') {
          console.error('Failed to load vault statistics:', result.error);
          setError('Failed to load statistics');
        }
      } catch (err) {
        console.error('Error loading vault statistics:', err);
        setError('Error loading statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadStatistics();
  }, [vault.name, propStatistics]);

  // Calculate key statistics
  const passphraseKeys = keys.filter(isPassphraseKey);
  const yubiKeys = keys.filter(isYubiKey);

  // Truncate vault name for display
  const displayName = vault.name.length > 20 ? `${vault.name.substring(0, 20)}...` : vault.name;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const keyId = e.dataTransfer.getData('keyId');
    if (keyId && onKeyDrop) {
      onKeyDrop(keyId);
    }
  };

  return (
    <div
      className={`
        relative rounded-lg border bg-card transition-all hover:shadow-lg
        ${isDropTarget ? 'border-blue-400 border-dashed' : isActive ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-default'}
      `}
      style={{
        boxShadow: isActive
          ? '0 4px 6px rgba(59, 130, 246, 0.15), 0 2px 4px rgba(59, 130, 246, 0.1)'
          : '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Card Content */}
      <div className="pb-14" onClick={onSelect} onDragOver={handleDragOver} onDrop={handleDrop}>
        {/* Rows 1-2: Header (Icon + Title + Badges) - NEVER FLIPS */}
        <div className="flex gap-3 px-5 pt-3 pb-2">
          {/* Vault Icon - Spans 2 rows, vertically centered */}
          <div
            className="rounded-lg p-2 flex-shrink-0 self-center"
            style={{
              backgroundColor: 'rgba(29, 78, 216, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <Archive className="h-4 w-4" style={{ color: '#3B82F6' }} />
          </div>

          {/* Right side: Title + Badges stacked */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Name + Flip button */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-heading truncate" title={vault.name}>
                {displayName}
              </h3>

              {/* Flip Button - Always in same position */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
                className="flex-shrink-0 p-1 rounded transition-colors"
                style={{ color: 'rgb(var(--text-muted))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                aria-label="Flip card"
              >
                <FlipHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Row 2: Key Badges (YubiKeys first to encourage hardware key usage) */}
            <div className="flex items-center gap-2">
              {/* YubiKeys - Orange theme (Hardware keys first!) */}
              {yubiKeys.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: 'rgba(249, 139, 28, 0.08)',
                    color: '#F98B1C',
                    border: '1px solid #ffd4a3',
                  }}
                  title={`${yubiKeys.length} YubiKey ${yubiKeys.length === 1 ? 'key' : 'keys'}`}
                >
                  <Fingerprint className="h-3 w-3" style={{ color: '#F98B1C' }} />
                  {yubiKeys.length}
                </span>
              )}

              {/* Passphrase Keys - Teal theme */}
              {passphraseKeys.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: 'rgba(15, 118, 110, 0.1)',
                    color: '#13897F',
                    border: '1px solid #B7E1DD',
                  }}
                  title={`${passphraseKeys.length} Passphrase ${passphraseKeys.length === 1 ? 'key' : 'keys'}`}
                >
                  <Key className="h-3 w-3" style={{ color: '#13897F' }} />
                  {passphraseKeys.length}
                </span>
              )}

              {/* Show message if no keys */}
              {keys.length === 0 && (
                <span className="text-xs text-secondary">No keys configured</span>
              )}
            </div>
          </div>
        </div>

        {/* Rows 3-4: Content - Toggle between file info and description */}
        {!isFlipped ? (
          // SHOW FILE INFO
          <>
            {/* Row 3: File Count + Size */}
            <div className="flex items-center gap-4 px-5 pt-2 pb-2">
              {isLoading ? (
                <div className="text-xs text-muted">Loading...</div>
              ) : error ? (
                <div className="text-xs" style={{ color: '#B91C1C' }}>
                  {error}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-xs font-medium text-secondary">
                    <Files className="h-3 w-3" />
                    <span>{formatFileCount(statistics?.file_count || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-secondary">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatBytes(statistics?.total_size_bytes || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Row 4: Creation Date/Time */}
            <div className="flex items-center px-5 pt-0 pb-2">
              <div className="flex items-center gap-1 text-xs font-medium text-secondary">
                <Clock className="h-3 w-3" />
                <span>
                  Created{' '}
                  {new Date(vault.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  {new Date(vault.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
            </div>
          </>
        ) : (
          // SHOW DESCRIPTION - Single container matching combined front rows 3+4 padding
          <div className="px-5 pt-2" style={{ paddingBottom: '16px' }}>
            <p className="text-xs text-secondary line-clamp-2">
              <span className="font-semibold">Description:</span>{' '}
              {vault.description || 'No description provided'}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions - Fixed Footer - NEVER FLIPS */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-subtle px-5 py-3 flex items-center justify-between gap-2 bg-card rounded-b-lg">
        {/* Delete Button - Left, ghost style (matches KeyCard) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            flex items-center justify-center gap-1 px-3 py-1.5
            text-xs font-medium rounded-md transition-all border
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
          aria-label="Delete vault"
        >
          Delete
        </button>

        {/* Keys Button - Right aligned, premium blue (matches KeyCard Vault button) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowKeyDialog(true);
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
        >
          <Key className="h-3 w-3" />
          Keys
        </button>
      </div>

      {/* Key Attachment Dialog */}
      <KeyAttachmentDialog
        isOpen={showKeyDialog}
        onClose={() => setShowKeyDialog(false)}
        vaultInfo={vault}
        onSuccess={() => {
          // Refresh keys for this vault
          if (onKeysUpdated) {
            onKeysUpdated();
          }
        }}
      />
    </div>
  );
};

export default VaultCard;
