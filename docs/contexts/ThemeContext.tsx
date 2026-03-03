'use client';

import type React from 'react';
import { createContext, useContext, useState } from 'react';

type DarkMode = 'light' | 'dark';

interface ThemeContextType {
  darkMode: DarkMode;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (theme: DarkMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyDarkMode = (newDarkMode: DarkMode) => {
  if (newDarkMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const readStorage = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const getInitialDarkMode = (): DarkMode => {
  const saved = readStorage('darkMode');
  return saved === 'dark' || saved === 'light' ? saved : 'light';
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkModeState] = useState<DarkMode>(getInitialDarkMode);

  const setDarkMode = (newDarkMode: DarkMode) => {
    setDarkModeState(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    applyDarkMode(newDarkMode);
  };

  const toggleDarkMode = () => {
    const newDarkMode: DarkMode = darkMode === 'dark' ? 'light' : 'dark';
    setDarkMode(newDarkMode);
  };

  const value: ThemeContextType = {
    darkMode,
    isDarkMode: darkMode === 'dark',
    toggleDarkMode,
    setDarkMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
