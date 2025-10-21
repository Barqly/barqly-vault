import React, { useEffect, useState } from 'react';
import { Archive, Key, Shield, FlipHorizontal, Clock, HardDrive, Files } from 'lucide-react';
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
  isActive,
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
        relative bg-white rounded-lg border-2 transition-all
        ${
          isActive
            ? 'border-blue-600 bg-blue-50 shadow-lg'
            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
        }
        ${isDropTarget ? 'border-blue-400 border-dashed bg-blue-50' : ''}
      `}
      style={{ height: '200px' }}
    >
      {/* Card Content - flippable */}
      <div
        className="cursor-pointer"
        onClick={onSelect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!isFlipped ? (
          // FRONT SIDE
          <>
            <div className="p-6 pb-3">
              <div className="flex items-start justify-between">
                {/* Vault Icon and Info */}
                <div className="flex gap-3">
                  <div
                    className={`
              p-3 rounded-lg
              ${isActive ? 'bg-blue-100' : 'bg-slate-100'}
            `}
                  >
                    <Archive
                      className={`h-8 w-8 ${isActive ? 'text-blue-600' : 'text-slate-600'}`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800" title={vault.name}>
                      {displayName}
                    </h3>

                    {/* Key Badges - moved here from separate section */}
                    <div className="flex gap-2 mt-2">
                      {/* Passphrase Keys */}
                      {passphraseKeys.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 rounded-full">
                          <Key className="h-3.5 w-3.5 text-green-700" />
                          <span className="text-xs font-medium text-green-700">
                            {passphraseKeys.length}
                          </span>
                        </div>
                      )}

                      {/* YubiKeys */}
                      {yubiKeys.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-100 rounded-full">
                          <Shield className="h-3.5 w-3.5 text-purple-700" />
                          <span className="text-xs font-medium text-purple-700">
                            {yubiKeys.length}
                          </span>
                        </div>
                      )}

                      {/* Show message if no keys */}
                      {keys.length === 0 && (
                        <span className="text-xs text-slate-400">No keys configured</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Flip Button */}
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="p-1 rounded hover:bg-slate-100"
                  aria-label="Flip card"
                >
                  <FlipHorizontal className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="px-6 pb-4">
              {isLoading ? (
                <div className="text-xs text-slate-400">Loading statistics...</div>
              ) : error ? (
                <div className="text-xs text-red-500">{error}</div>
              ) : (
                <div className="flex items-center gap-4 text-xs text-slate-500">
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
              <h3 className="text-sm font-semibold text-slate-700">Description</h3>

              {/* Flip Back Button */}
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="p-1 rounded hover:bg-slate-100"
                aria-label="Flip back"
              >
                <FlipHorizontal className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-700 pb-12">
              {vault.description || 'No description provided'}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions - Fixed Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 px-5 py-3 flex items-center gap-2 bg-white rounded-b-lg">
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

        {/* Keys Button - Primary action, premium blue (matches KeyCard Vault button) */}
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
