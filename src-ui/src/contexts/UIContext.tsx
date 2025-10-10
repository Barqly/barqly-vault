import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ViewMode = 'cards' | 'table';

interface UIContextValue {
  // Sidebar state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme (future feature)
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // View modes
  keyViewMode: ViewMode;
  setKeyViewMode: (mode: ViewMode) => void;

  // Persistence
  savePreferences: () => void;
  loadPreferences: () => void;
}

interface UIPreferences {
  sidebarCollapsed: boolean;
  theme: Theme;
  keyViewMode: ViewMode;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

const STORAGE_KEY = 'barqly-vault-ui-preferences';

const defaultPreferences: UIPreferences = {
  sidebarCollapsed: false,
  theme: 'light',
  keyViewMode: 'cards',
};

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(defaultPreferences.sidebarCollapsed);
  const [theme, setThemeState] = useState<Theme>(defaultPreferences.theme);
  const [keyViewMode, setKeyViewModeState] = useState<ViewMode>(defaultPreferences.keyViewMode);

  // Load preferences from localStorage on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs: UIPreferences = JSON.parse(stored);
        setSidebarCollapsedState(prefs.sidebarCollapsed ?? defaultPreferences.sidebarCollapsed);
        setThemeState(prefs.theme ?? defaultPreferences.theme);
        setKeyViewModeState(prefs.keyViewMode ?? defaultPreferences.keyViewMode);
      }
    } catch (error) {
      console.error('Failed to load UI preferences:', error);
    }
  }, []);

  const savePreferences = useCallback(() => {
    try {
      const prefs: UIPreferences = {
        sidebarCollapsed,
        theme,
        keyViewMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error('Failed to save UI preferences:', error);
    }
  }, [sidebarCollapsed, theme, keyViewMode]);

  // Save preferences whenever they change
  useEffect(() => {
    savePreferences();
  }, [sidebarCollapsed, theme, keyViewMode, savePreferences]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setKeyViewMode = useCallback((mode: ViewMode) => {
    setKeyViewModeState(mode);
  }, []);

  const value: UIContextValue = {
    sidebarCollapsed,
    setSidebarCollapsed,
    theme,
    setTheme,
    keyViewMode,
    setKeyViewMode,
    savePreferences,
    loadPreferences,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextValue => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};