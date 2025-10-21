import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
}

/**
 * Floating Action Button (FAB) - Speed Dial Pattern
 * Single FAB that expands to show labeled action menu
 * Material Design pattern for multiple related actions
 */
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ actions }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Backdrop - Close menu when clicking outside */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
          style={{ backgroundColor: 'transparent' }}
        />
      )}

      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        {/* Speed Dial Actions - Appear when expanded */}
        {isExpanded && (
          <div className="flex flex-col gap-2 mb-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                  setIsExpanded(false);
                }}
                className="
                  flex items-center gap-3 px-4 py-3
                  rounded-lg shadow-lg border
                  text-sm font-medium
                  transition-all
                "
                style={{
                  backgroundColor: 'rgb(var(--surface-card))',
                  borderColor: 'rgb(var(--border-default))',
                  color: 'rgb(var(--text-primary))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                  e.currentTarget.style.borderColor = '#1D4ED8';
                  e.currentTarget.style.transform = 'translateX(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-card))';
                  e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {action.icon}
                <span className="whitespace-nowrap">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            flex items-center justify-center
            w-14 h-14 rounded-full shadow-lg
            text-white font-medium
            transition-all
          "
          style={{
            backgroundColor: '#1D4ED8',
            transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          onMouseEnter={(e) => {
            if (!isExpanded) {
              e.currentTarget.style.backgroundColor = '#1E40AF';
              e.currentTarget.style.transform = 'scale(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExpanded) {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title={isExpanded ? 'Close menu' : 'Quick actions'}
        >
          {isExpanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
};

export default FloatingActionButton;
