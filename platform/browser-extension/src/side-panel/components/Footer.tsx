import { Button } from './retro/Button.js';
import { Input } from './retro/Input.js';
import { useTheme } from '../hooks/useTheme.js';
import { Moon, Sun } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { PortChangedMessage } from '../../extension-messages.js';

const DEFAULT_PORT = 9515;
const STORAGE_KEY = 'serverPort';

const isValidPort = (value: string): boolean => {
  const num = Number(value);
  return Number.isInteger(num) && num >= 1 && num <= 65535;
};

const PortEditor = () => {
  const [port, setPort] = useState(DEFAULT_PORT);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then(
      result => {
        const stored = result[STORAGE_KEY] as number | undefined;
        if (typeof stored === 'number' && isValidPort(String(stored))) {
          setPort(stored);
        }
      },
      () => {
        // Storage unavailable — keep default
      },
    );
  }, []);

  const startEditing = useCallback(() => {
    setDraft(String(port));
    setInvalid(false);
    setEditing(true);
  }, [port]);

  const savePort = useCallback(() => {
    if (!isValidPort(draft)) {
      setInvalid(true);
      return;
    }
    const newPort = Number(draft);
    setPort(newPort);
    setEditing(false);
    setInvalid(false);
    chrome.storage.local.set({ [STORAGE_KEY]: newPort }).catch(() => {});
    const message: PortChangedMessage = { type: 'port-changed', port: newPort };
    chrome.runtime.sendMessage(message).catch(() => {});
  }, [draft]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setInvalid(false);
  }, []);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground font-mono text-xs">Port:</span>
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={e => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') savePort();
            if (e.key === 'Escape') cancelEditing();
          }}
          onBlur={savePort}
          aria-invalid={invalid || undefined}
          aria-label="Server port"
          placeholder="9515"
          className="h-7 w-[5.5rem] px-2 py-0 font-mono text-xs"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className="text-muted-foreground hover:text-foreground cursor-pointer font-mono text-xs transition"
      aria-label="Edit server port">
      Port: {port}
    </button>
  );
};

const Footer = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <footer className="border-border bg-card sticky bottom-0 flex items-center justify-between border-t-2 px-3 py-3 text-sm">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-9 w-9" asChild>
          <a
            href="https://github.com/opentabs-dev/opentabs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>
      </div>
      <PortEditor />
    </footer>
  );
};

export { Footer };
