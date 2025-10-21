import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryActions?: FABAction[];
}

/**
 * Floating Action Button (FAB) - Material Design pattern
 * Primary action always visible, secondary actions in expandable menu
 */
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  primaryAction,
  secondaryActions = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-30 flex flex-col items-end gap-3">
      {/* Secondary Actions Menu - Appears when expanded */}
      {isExpanded && secondaryActions.length > 0 && (
        <div className="flex flex-col gap-2">
          {secondaryActions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                setIsExpanded(false);
              }}
              className="
                flex items-center gap-3 px-4 py-3
                bg-white rounded-lg shadow-lg border
                text-sm font-medium
                transition-all
                animate-in fade-in slide-in-from-bottom-2
              "
              style={{
                borderColor: 'rgb(var(--border-default))',
                color: 'rgb(var(--text-primary))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                e.currentTarget.style.borderColor = '#1D4ED8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Primary Action Button */}
      <button
        onClick={primaryAction.onClick}
        className="
          flex items-center justify-center gap-2
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
        title={primaryAction.label}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Expand/Collapse Button (if secondary actions exist) */}
      {secondaryActions.length > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            absolute -top-2 -left-2
            flex items-center justify-center
            w-8 h-8 rounded-full shadow-md
            bg-white border
            transition-all
          "
          style={{
            borderColor: 'rgb(var(--border-default))',
            color: 'rgb(var(--text-secondary))',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#1D4ED8';
            e.currentTarget.style.color = '#1D4ED8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
            e.currentTarget.style.color = 'rgb(var(--text-secondary))';
          }}
        >
          {isExpanded ? <X className="h-4 w-4" /> : <Plus className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
};

export default FloatingActionButton;
