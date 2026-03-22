/**
 * Storage analysis module for the site analyzer.
 *
 * Pure analysis function: takes pre-collected storage key names from page
 * scripts and returns structured information about cookies, localStorage,
 * and sessionStorage usage. Does not read storage values (security) —
 * only reports key names with an auth-related flag.
 */

// ---------------------------------------------------------------------------
// Input types — match data shapes the orchestrator collects via page scripts
// ---------------------------------------------------------------------------

/** Data collected by the orchestrator and passed to detectStorage. */
interface StorageDetectionInput {
  /** Cookie names parsed from document.cookie. */
  cookieNames: string[];
  /** Keys from Object.keys(localStorage). */
  localStorageKeys: string[];
  /** Keys from Object.keys(sessionStorage). */
  sessionStorageKeys: string[];
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** A storage key name with an auth-relevance flag based on pattern matching. */
interface StorageKeyInfo {
  name: string;
  isAuth: boolean;
}

/** Result of storage analysis: cookie, localStorage, and sessionStorage keys with auth flags. */
interface StorageAnalysis {
  cookies: StorageKeyInfo[];
  localStorage: StorageKeyInfo[];
  sessionStorage: StorageKeyInfo[];
}

// ---------------------------------------------------------------------------
// Auth-related key pattern
// ---------------------------------------------------------------------------

const AUTH_KEY_PATTERN = /session|token|auth|jwt|csrf|user|login|credential|sid|key|secret/i;

// ---------------------------------------------------------------------------
// Detection logic
// ---------------------------------------------------------------------------

/** Classify a storage key name with an isAuth flag. */
const classifyKey = (name: string): StorageKeyInfo => ({
  name,
  isAuth: AUTH_KEY_PATTERN.test(name),
});

/**
 * Analyze collected storage key names and flag auth-related entries.
 *
 * This is a pure function: takes key names in, returns structured results.
 * Storage values are never read — only key names are analyzed for
 * auth-related patterns.
 */
const detectStorage = (input: StorageDetectionInput): StorageAnalysis => ({
  cookies: input.cookieNames.map(classifyKey),
  localStorage: input.localStorageKeys.map(classifyKey),
  sessionStorage: input.sessionStorageKeys.map(classifyKey),
});

export type { StorageAnalysis, StorageDetectionInput, StorageKeyInfo };
export { detectStorage };
