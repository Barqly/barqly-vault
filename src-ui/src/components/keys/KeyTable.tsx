import React, { useState } from 'react';
import { Key, Fingerprint, Link2, FileText, Copy, Check } from 'lucide-react';
import { GlobalKey, VaultStatistics, commands } from '../../bindings';
import { logger } from '../../lib/logger';

interface KeyTableProps {
  keys: GlobalKey[];
  vaultAttachments: (keyId: string) => string[];
  vaultStats?: Map<string, VaultStatistics>;
  onAttach?: (keyId: string) => void;
  onExport?: (keyId: string) => void;
  onRefresh?: () => Promise<void>;
  vaultNames?: Map<string, string>;
}

export const KeyTable: React.FC<KeyTableProps> = ({
  keys,
  vaultAttachments,
  vaultStats,
  onAttach,
  onExport,
  onRefresh,
  vaultNames = new Map(),
}) => {
  const [sortBy, setSortBy] = useState<'label' | 'type'>('label');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Sort keys
  const sortedKeys = [...keys].sort((a, b) => {
    if (sortBy === 'type') {
      const typeA = a.key_type.type;
      const typeB = b.key_type.type;
      if (typeA !== typeB) {
        return sortDirection === 'asc'
          ? typeA.localeCompare(typeB)
          : typeB.localeCompare(typeA);
      }
    }
    // Default to label sort
    return sortDirection === 'asc'
      ? a.label.localeCompare(b.label)
      : b.label.localeCompare(a.label);
  });

  const handleSort = (column: 'label' | 'type') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const handleCopy = (keyId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Helper to check if key is used in envelope
  const isKeyUsedInEnvelope = (keyRef: GlobalKey): boolean => {
    if (!vaultStats || keyRef.vault_associations.length === 0) {
      return false;
    }

    for (const vaultId of keyRef.vault_associations) {
      const stats = vaultStats.get(vaultId);
      if (stats && stats.encryption_count > 0) {
        return true;
      }
    }
    return false;
  };

  const handleDeactivate = async (keyRef: GlobalKey) => {
    const usedInEnvelope = isKeyUsedInEnvelope(keyRef);
    if (usedInEnvelope) {
      alert("This key is part of a vault's encryption envelope and cannot be deactivated.");
      return;
    }

    if (!confirm('Deactivate this key? You have 30 days to restore it before permanent deletion.')) {
      return;
    }

    try {
      const result = await commands.deactivateKey({
        key_id: keyRef.id,
        reason: null,
      });

      if (result.status === 'ok') {
        await onRefresh?.();
      } else {
        alert(`Failed to deactivate key: ${result.error.message}`);
      }
    } catch (err) {
      logger.error('KeyTable', 'Error deactivating key', err as Error);
      alert('An unexpected error occurred.');
    }
  };

  const handleRestore = async (keyId: string) => {
    try {
      const result = await commands.restoreKey({ key_id: keyId });

      if (result.status === 'ok') {
        await onRefresh?.();
      } else {
        alert(`Failed to restore key: ${result.error.message}`);
      }
    } catch (err) {
      logger.error('KeyTable', 'Error restoring key', err as Error);
      alert('An unexpected error occurred.');
    }
  };

  // Get status badge helper
  const getStatusBadge = (keyRef: GlobalKey) => {
    const { lifecycle_status, deactivated_at } = keyRef;

    if (lifecycle_status === 'pre_activation') {
      return (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          New
        </span>
      );
    }

    if (lifecycle_status === 'deactivated' && deactivated_at) {
      const now = new Date();
      const deactivated = new Date(deactivated_at);
      const daysPassed = Math.floor((now.getTime() - deactivated.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 30 - daysPassed);

      return (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
          Deactivated {daysRemaining}d
        </span>
      );
    }

    if (lifecycle_status === 'compromised') {
      return (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
          Compromised
        </span>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('label')}
                  className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Key
                  {sortBy === 'label' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Vaults</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Serial</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Public Key</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Actions</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {sortedKeys.map((keyRef) => {
              const isPassphrase = keyRef.key_type.type === 'Passphrase';
              const isYubiKey = keyRef.key_type.type === 'YubiKey';
              const attachments = vaultAttachments(keyRef.id);
              const vaultCount = attachments.length;
              const isDeactivated = keyRef.lifecycle_status === 'deactivated';
              const usedInEnvelope = isKeyUsedInEnvelope(keyRef);
              const canDeactivate = !isDeactivated && !usedInEnvelope;
              const isCopied = copiedKeyId === keyRef.id;

              return (
                <tr
                  key={keyRef.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  {/* Icon + Label */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-lg p-1.5 flex-shrink-0"
                        style={{
                          backgroundColor: isPassphrase ? 'rgba(15, 118, 110, 0.1)' : 'rgba(197, 161, 0, 0.15)',
                          border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #E6D8AA',
                        }}
                      >
                        {isPassphrase ? (
                          <Key className="h-4 w-4" style={{ color: '#0F766E' }} />
                        ) : (
                          <Fingerprint className="h-4 w-4" style={{ color: '#A16207' }} />
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-700" title={keyRef.label}>
                        {keyRef.label.length > 12 ? keyRef.label.slice(0, 12) + '...' : keyRef.label}
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3">
                    {getStatusBadge(keyRef)}
                  </td>

                  {/* Vault Attachments */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${vaultCount === 0 ? 'text-slate-500' : 'text-slate-600'}`}>
                        {vaultCount} {vaultCount === 1 ? 'vault' : 'vaults'}
                      </span>
                      <button
                        onClick={() => onAttach?.(keyRef.id)}
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
                  </td>

                  {/* Serial (YubiKey only) */}
                  <td className="px-4 py-3">
                    {isYubiKey && keyRef.key_type.type === 'YubiKey' && (
                      <span className="text-xs font-medium text-slate-600">
                        {keyRef.key_type.data.serial}
                      </span>
                    )}
                  </td>

                  {/* Public Key */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-700 font-mono" title={keyRef.recipient}>
                        {keyRef.recipient.slice(0, 12)}...
                      </code>
                      <button
                        onClick={() => handleCopy(keyRef.id, keyRef.recipient)}
                        className={`transition-colors ${
                          isCopied ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title={isCopied ? 'Copied!' : 'Copy public key'}
                      >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Deactivate/Restore */}
                      {isDeactivated ? (
                        <button
                          onClick={() => handleRestore(keyRef.id)}
                          className="
                            flex items-center gap-1 px-2 py-1
                            text-xs font-medium text-white
                            rounded-md transition-colors
                          "
                          style={{ backgroundColor: '#1D4ED8' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#1E40AF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1D4ED8';
                          }}
                          title="Restore this key"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => canDeactivate && handleDeactivate(keyRef)}
                          disabled={!canDeactivate}
                          className={`
                            flex items-center gap-1 px-2 py-1
                            text-xs font-medium rounded-md transition-colors
                            ${canDeactivate
                              ? 'text-slate-600 border border-slate-300 hover:bg-slate-50'
                              : 'text-slate-400 border border-slate-300 opacity-50 cursor-not-allowed'
                            }
                          `}
                          title={
                            usedInEnvelope
                              ? "Cannot deactivate - part of vault's encryption envelope"
                              : 'Deactivate this key'
                          }
                        >
                          Deactivate
                        </button>
                      )}

                      {/* Export (Passphrase only) */}
                      {isPassphrase && onExport && (
                        <button
                          onClick={() => onExport(keyRef.id)}
                          className="
                            flex items-center gap-1 px-2 py-1
                            text-xs font-medium text-slate-600
                            border border-slate-200 rounded-md
                            hover:bg-slate-50 transition-colors
                          "
                          title="Download encrypted backup"
                        >
                          <FileText className="h-3 w-3" />
                          Export
                        </button>
                      )}

                      {/* Vault */}
                      <button
                        onClick={() => onAttach?.(keyRef.id)}
                        className="
                          flex items-center gap-1 px-2 py-1
                          text-xs font-medium text-white
                          rounded-md transition-colors
                        "
                        style={{ backgroundColor: '#1D4ED8' }}
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {keys.length === 0 && (
          <div className="text-center py-12">
            <Key className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No keys found</h3>
            <p className="text-sm text-slate-500">
              Create a new passphrase key or detect a YubiKey to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
