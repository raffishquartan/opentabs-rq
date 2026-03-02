// ---------------------------------------------------------------------------
// Storage utilities for plugin authors
// ---------------------------------------------------------------------------

import { log } from './log.js';

/**
 * Reads a value from localStorage. Returns null if the key is not found or
 * if storage access throws (e.g., SecurityError in sandboxed iframes).
 *
 * When localStorage is undefined (deleted by the host app, e.g., Discord),
 * falls back to reading from a same-origin iframe's localStorage, which
 * retains access to the underlying storage even when the property is deleted
 * from the main window.
 */
export const getLocalStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    // Direct access failed — localStorage may be deleted or inaccessible.
  }

  // Distinguish deleted localStorage (property is undefined) from a throwing
  // getter (SecurityError etc.). Access the property one more time: if it
  // throws, storage is truly inaccessible — give up. If it returns undefined,
  // the property was deleted — proceed to the iframe fallback.
  let storage: Storage | undefined;
  try {
    storage = localStorage as Storage | undefined;
  } catch {
    return null;
  }
  if (storage !== undefined) {
    return null;
  }

  // localStorage is undefined — some apps (e.g., Discord) delete the property.
  // Same-origin iframes retain access to the underlying storage.
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    try {
      const iframeStorage = iframe.contentWindow?.localStorage;
      return iframeStorage ? iframeStorage.getItem(key) : null;
    } finally {
      document.body.removeChild(iframe);
    }
  } catch {
    return null;
  }
};

/**
 * Writes a value to localStorage. Logs a warning if storage access throws
 * (e.g., SecurityError in sandboxed iframes or QuotaExceededError when storage is full).
 */
export const setLocalStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    log.warn(`setLocalStorage failed for key "${key}"`, error);
  }
};

/**
 * Reads a value from sessionStorage. Returns null if the key is not found or
 * if storage access throws (e.g., SecurityError in sandboxed iframes).
 */
export const getSessionStorage = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Writes a value to sessionStorage. Logs a warning if storage access throws
 * (e.g., SecurityError in sandboxed iframes or QuotaExceededError when storage is full).
 */
export const setSessionStorage = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    log.warn(`setSessionStorage failed for key "${key}"`, error);
  }
};

/**
 * Removes a key from localStorage. Logs a warning if storage access throws
 * (e.g., SecurityError in sandboxed iframes).
 */
export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    log.warn(`removeLocalStorage failed for key "${key}"`, error);
  }
};

/**
 * Removes a key from sessionStorage. Logs a warning if storage access throws
 * (e.g., SecurityError in sandboxed iframes).
 */
export const removeSessionStorage = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    log.warn(`removeSessionStorage failed for key "${key}"`, error);
  }
};

/**
 * Reads a cookie by name from `document.cookie`. Handles URI-encoded values.
 * Returns null if the cookie is not found or if cookie access throws
 * (e.g., SecurityError in sandboxed iframes).
 */
export const getCookie = (name: string): string | null => {
  try {
    const prefix = `${name}=`;
    const entries = document.cookie.split('; ');
    for (const entry of entries) {
      if (entry.startsWith(prefix)) {
        try {
          return decodeURIComponent(entry.slice(prefix.length));
        } catch {
          return entry.slice(prefix.length);
        }
      }
    }
    return null;
  } catch {
    return null;
  }
};
