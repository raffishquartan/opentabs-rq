import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

const applyTheme = (theme: Theme): void => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

const useTheme = (): { theme: Theme; toggleTheme: () => void } => {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then(
      result => {
        const stored = result[STORAGE_KEY] as string | undefined;
        if (stored === 'light' || stored === 'dark') {
          setTheme(stored);
          applyTheme(stored);
        }
      },
      () => {
        // Storage unavailable — keep current theme from dark-mode.js
      },
    );
  }, []);

  const toggleTheme = () => {
    const next: Theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    chrome.storage.local.set({ [STORAGE_KEY]: next }).catch(() => {
      // Storage write failed — theme is still applied visually
    });
  };

  return { theme, toggleTheme };
};

export type { Theme };
export { useTheme };
