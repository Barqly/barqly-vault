import React from 'react';
import { Archive, Plus } from 'lucide-react';

interface VaultEmptyStateProps {
  onCreateClick: () => void;
}

/**
 * VaultEmptyState Component - R2 Phase 3
 *
 * Visual empty state when no vaults exist
 * Features:
 * - Clear messaging
 * - Visual icon
 * - Create vault CTA
 */
const VaultEmptyState: React.FC<VaultEmptyStateProps> = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      {/* Icon Container */}
      <div className="p-4 bg-slate-100 rounded-full mb-6">
        <Archive className="h-16 w-16 text-slate-400" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-slate-800 mb-2">No vaults yet</h3>

      {/* Description */}
      <p className="text-center text-slate-500 max-w-sm mb-8">
        Create your first vault to start protecting your data with encryption
      </p>

      {/* CTA Button */}
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Plus className="h-5 w-5" />
        Create First Vault
      </button>
    </div>
  );
};

export default VaultEmptyState;
