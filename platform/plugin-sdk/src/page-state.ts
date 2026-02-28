// ---------------------------------------------------------------------------
// Page state utilities for plugin authors
// ---------------------------------------------------------------------------

/**
 * Safe deep property access on `globalThis` using dot-notation path.
 * Returns `undefined` if any segment in the path is missing or if a getter throws.
 *
 * @example
 * const token = getPageGlobal('TS.boot_data.api_token') as string | undefined;
 */
export const getPageGlobal = (path: string): unknown => {
  try {
    const segments = path.split('.');
    let current: unknown = globalThis;
    for (const segment of segments) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object' && typeof current !== 'function') return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  } catch {
    return undefined;
  }
};

/**
 * Returns the current page URL (`window.location.href`).
 */
export const getCurrentUrl = (): string => window.location.href;

/**
 * Returns the current page title (`document.title`).
 */
export const getPageTitle = (): string => document.title;
