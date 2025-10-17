import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ collapsed = false }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`flex border rounded-lg overflow-hidden border-default ${
        collapsed ? 'flex-col' : 'flex-row'
      }`}
    >
      <button
        onClick={() => setTheme('light')}
        className={`p-2 transition-colors ${
          theme === 'light'
            ? 'bg-brand-blue text-white'
            : 'bg-transparent hover:bg-hover text-secondary'
        }`}
        title="Light mode"
        aria-label="Switch to light mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 transition-colors ${
          theme === 'dark'
            ? 'bg-brand-blue text-white'
            : 'bg-transparent hover:bg-hover text-secondary'
        }`}
        title="Dark mode"
        aria-label="Switch to dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 transition-colors ${
          theme === 'system'
            ? 'bg-brand-blue text-white'
            : 'bg-transparent hover:bg-hover text-secondary'
        }`}
        title="System preference"
        aria-label="Use system theme preference"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
};
