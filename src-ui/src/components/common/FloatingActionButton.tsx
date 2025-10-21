import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  label: string;
  onClick: () => void;
}

/**
 * Floating Action Button (FAB) - Minimalist Design
 * Single action button for primary vault creation
 * Material Design pattern
 */
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="
        fixed bottom-8 right-8 z-50
        flex items-center justify-center
        w-14 h-14 rounded-full shadow-lg
        text-white font-medium
        transition-all
      "
      style={{
        backgroundColor: '#1D4ED8',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#1E40AF';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#1D4ED8';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title={label}
      aria-label={label}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
};

export default FloatingActionButton;
