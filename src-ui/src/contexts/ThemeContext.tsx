import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: EffectiveTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage or default to 'system'
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('barqly-theme');
    return (stored as Theme) || 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('light');

  // Resolve effective theme and handle system preference changes
  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = (isDark: boolean) => {
        const resolved: EffectiveTheme = isDark ? 'dark' : 'light';
        setEffectiveTheme(resolved);
        document.documentElement.setAttribute('data-theme', resolved);
      };

      // Apply initial
      applySystemTheme(mq.matches);

      // Listen for system preference changes
      const handleChange = (e: MediaQueryListEvent) => applySystemTheme(e.matches);
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    } else {
      // Direct theme selection
      setEffectiveTheme(theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('barqly-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// Helper hook for inline styles that need theme-aware colors
export const useThemeColors = () => {
  const { effectiveTheme } = useTheme();

  return {
    surface: {
      app: effectiveTheme === 'dark' ? '#0f172a' : '#ffffff',
      card: effectiveTheme === 'dark' ? '#1e293b' : '#ffffff',
      elevated: effectiveTheme === 'dark' ? '#334155' : '#f8fafc',
      input: effectiveTheme === 'dark' ? '#1e293b' : '#ffffff',
      hover: effectiveTheme === 'dark' ? '#334155' : '#f8fafc',
    },
    text: {
      primary: effectiveTheme === 'dark' ? '#f8fafc' : '#1e293b',
      secondary: effectiveTheme === 'dark' ? '#94a3b8' : '#64748b',
      muted: effectiveTheme === 'dark' ? '#64748b' : '#94a3b8',
      inverse: effectiveTheme === 'dark' ? '#0f172a' : '#ffffff',
    },
    border: {
      default: effectiveTheme === 'dark' ? '#334155' : '#e2e8f0',
      subtle: effectiveTheme === 'dark' ? '#1e293b' : '#f1f5f9',
      strong: effectiveTheme === 'dark' ? '#64748b' : '#94a3b8',
    },
    // Brand colors stay the same!
    brand: {
      blue: '#1D4ED8',
      blueHover: '#1E40AF',
      teal: '#13897F',
      orange: '#F98B1C',
      orangeVibrant: '#ff8a00', // For dark backgrounds only
    },
  };
};
