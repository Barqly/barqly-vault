import React from 'react';
import {
  Archive,
  Key,
  Shield,
  Lock,
  Plus,
  MoreVertical,
  Clock,
  HardDrive,
  Files,
} from 'lucide-react';
import { VaultSummary, KeyReference } from '../../bindings';
import { isPassphraseKey, isYubiKey } from '../../lib/key-types';

interface VaultCardProps {
  vault: VaultSummary;
  keys: KeyReference[];
  isActive: boolean;
  isDropTarget?: boolean;
  onSelect: () => void;
  onEncrypt: () => void;
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
  onSelect,
  onEncrypt,
  onManageKeys,
  onDelete,
  onKeyDrop,
}) => {
  // Calculate key statistics
  const passphraseKeys = keys.filter(isPassphraseKey);
  const yubiKeys = keys.filter(isYubiKey);
  const totalKeySlots = 4; // Max 4 keys per vault
  const emptySlots = Math.max(0, totalKeySlots - keys.length);

  // Format last encrypted time (mock data for now)
  const formatLastTime = () => {
    // In future, this would come from vault metadata
    return '2 hours ago';
  };

  // Format vault size (mock data for now)
  const formatSize = () => {
    // In future, this would come from vault statistics
    return '125 MB';
  };

  // Format file count (mock data for now)
  const formatFileCount = () => {
    // In future, this would come from vault statistics
    return '42 files';
  };

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
        relative bg-white rounded-lg border-2 transition-all cursor-pointer
        ${
          isActive
            ? 'border-blue-600 bg-blue-50 shadow-lg'
            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
        }
        ${isDropTarget ? 'border-blue-400 border-dashed bg-blue-50' : ''}
      `}
      onClick={onSelect}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Card Header */}
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
              <Archive className={`h-8 w-8 ${isActive ? 'text-blue-600' : 'text-slate-600'}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-800">{vault.name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {vault.description || 'No description'}
              </p>
            </div>
          </div>

          {/* More Options */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Future: Show context menu
            }}
            className="p-1 rounded hover:bg-slate-100"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Key Badges Section */}
      <div className="px-6 pb-3">
        <div className="flex gap-2">
          {/* Passphrase Keys */}
          {passphraseKeys.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 rounded-full">
              <Key className="h-3.5 w-3.5 text-green-700" />
              <span className="text-xs font-medium text-green-700">{passphraseKeys.length}</span>
            </div>
          )}

          {/* YubiKeys */}
          {yubiKeys.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-100 rounded-full">
              <Shield className="h-3.5 w-3.5 text-purple-700" />
              <span className="text-xs font-medium text-purple-700">{yubiKeys.length}</span>
            </div>
          )}

          {/* Empty Slots */}
          {emptySlots > 0 && keys.length < totalKeySlots && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManageKeys();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-dashed border-slate-300 rounded-full hover:border-blue-400 hover:bg-blue-50 transition-colors"
              aria-label="Add key"
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Add</span>
            </button>
          )}

          {/* Show remaining slots indicator */}
          {keys.length === 0 && <span className="text-xs text-slate-400">No keys configured</span>}
        </div>
      </div>

      {/* Metadata Section */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatLastTime()}</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>{formatSize()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Files className="h-3 w-3" />
            <span>{formatFileCount()}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-slate-200 px-4 py-3 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEncrypt();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        >
          <Lock className="h-3.5 w-3.5" />
          Encrypt
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onManageKeys();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Key className="h-3.5 w-3.5" />
          Keys
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-auto px-2 py-1.5 text-sm text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          aria-label="Delete vault"
        >
          Delete
        </button>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-0 right-0 mt-2 mr-2">
          <div className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">Active</div>
        </div>
      )}
    </div>
  );
};

export default VaultCard;
