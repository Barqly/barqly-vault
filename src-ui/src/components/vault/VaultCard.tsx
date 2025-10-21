import React, { useEffect, useState } from 'react';
import { Archive, Key, FlipHorizontal, Clock, HardDrive, Files, Fingerprint } from 'lucide-react';
import { VaultSummary, KeyReference, VaultStatistics, commands } from '../../bindings';
import { isPassphraseKey, isYubiKey } from '../../lib/key-types';
import { formatLastEncrypted, formatBytes, formatFileCount } from '../../lib/format-utils';

interface VaultCardProps {
  vault: VaultSummary;
  keys: KeyReference[];
  isActive: boolean;
  isDropTarget?: boolean;
  statistics?: VaultStatistics | null; // Optional prop for cached statistics
  onSelect: () => void;
  onManageKeys: () => void;
  onDelete: () => void;
  onKeyDrop?: (keyId: string) => void;
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
  isActive: _isActive,
  isDropTarget,
  statistics: propStatistics, // Receive statistics as prop
  onSelect,
  onManageKeys,
  onDelete,
  onKeyDrop,
}) => {
  const [localStatistics, setLocalStatistics] = useState<VaultStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

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
        // Use vault.name (which is the sanitized filesystem-safe name) for the API
        const result = await commands.getVaultStatistics({
          vault_name: vault.name,
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
        relative rounded-lg border bg-card transition-all border-default hover:shadow-lg
        ${isDropTarget ? 'border-blue-400 border-dashed' : ''}
      `}
      style={{
        height: '200px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Card Content - flippable */}
      <div
        className="cursor-pointer"
        onClick={onSelect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!isFlipped ? (
          // FRONT SIDE - Formalized row structure (matches KeyCard)
          <>
            {/* Row 1: Icon + Name + Flip button */}
            <div className="flex items-center gap-3 px-5 pt-3 pb-2">
              {/* Vault Icon */}
              <div
                className="rounded-lg p-2 flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(29, 78, 216, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                <Archive className="h-4 w-4" style={{ color: '#3B82F6' }} />
              </div>

              {/* Vault Name */}
              <h3 className="font-semibold text-heading truncate flex-1" title={vault.name}>
                {displayName}
              </h3>

              {/* Flip Button */}
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

            {/* Row 2: Key Badges */}
            <div className="flex items-center gap-2 px-5 py-2">
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

              {/* YubiKeys - Orange theme */}
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

              {/* Show message if no keys */}
              {keys.length === 0 && (
                <span className="text-xs text-secondary">No keys configured</span>
              )}
            </div>

            {/* Row 3: Metadata (Time + Size + Files combined) */}
            <div className="flex items-center px-5 pt-2 pb-2">
              {isLoading ? (
                <div className="text-xs text-muted">Loading...</div>
              ) : error ? (
                <div className="text-xs" style={{ color: '#B91C1C' }}>
                  {error}
                </div>
              ) : (
                <div className="flex items-center gap-4 text-xs font-medium text-secondary">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatLastEncrypted(statistics?.last_encrypted_at || null)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatBytes(statistics?.total_size_bytes || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Files className="h-3 w-3" />
                    <span>{formatFileCount(statistics?.file_count || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // BACK SIDE - Description
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-semibold text-heading">Description</h3>

              {/* Flip Back Button */}
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="p-1 rounded transition-colors"
                style={{ color: 'rgb(var(--text-muted))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                aria-label="Flip back"
              >
                <FlipHorizontal className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-main pb-12">
              {vault.description || 'No description provided'}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions - Fixed Footer */}
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
            onManageKeys();
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
    </div>
  );
};

export default VaultCard;
