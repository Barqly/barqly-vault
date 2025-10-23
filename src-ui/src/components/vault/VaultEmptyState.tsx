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
    <div className="flex flex-col items-center justify-center py-12 px-8">
      {/* Icon Container */}
      <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
        <Archive className="h-16 w-16 text-slate-400 dark:text-slate-500" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">No vaults yet</h3>

      {/* Description */}
      <p className="text-center text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        Create your first vault to start protecting your data with encryption
      </p>

      {/* CTA Button */}
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-colors shadow-sm"
        style={{ backgroundColor: '#1D4ED8' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
      >
        <Plus className="h-5 w-5" />
        Create First Vault
      </button>
    </div>
  );
};

export default VaultEmptyState;
