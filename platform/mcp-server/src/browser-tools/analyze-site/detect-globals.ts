/**
 * Window globals detection module for the site analyzer.
 *
 * Pure analysis function: takes the result of scanning window.* in the
 * page context and returns structured information about non-standard
 * globals. Does not call browser tools directly — the orchestrator
 * collects data and passes it here.
 */

// ---------------------------------------------------------------------------
// Input types — match data shapes the orchestrator collects via page scripts
// ---------------------------------------------------------------------------

/** A non-standard window global collected from the page context. */
interface GlobalProperty {
  path: string;
  type: string;
  topLevelKeys: string[] | undefined;
}

/** Data collected by the orchestrator and passed to detectGlobals. */
interface GlobalsDetectionInput {
  globals: GlobalProperty[];
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** A classified window global with an auth-data flag indicating whether its keys match auth patterns. */
interface GlobalInfo {
  path: string;
  type: string;
  hasAuthData: boolean;
  topLevelKeys: string[] | undefined;
}

/** Result of window globals detection: classified globals with auth-relevance flags. */
interface GlobalsAnalysis {
  globals: GlobalInfo[];
}

// ---------------------------------------------------------------------------
// Auth-related key detection
// ---------------------------------------------------------------------------

const AUTH_KEY_PATTERN = /session|token|auth|jwt|csrf|user|login|credential|account|profile/i;

/**
 * Returns true if any of the given keys match auth-related patterns.
 */
const containsAuthKeys = (keys: string[] | undefined): boolean => {
  if (!keys) return false;
  return keys.some(key => AUTH_KEY_PATTERN.test(key));
};

// ---------------------------------------------------------------------------
// Detection logic
// ---------------------------------------------------------------------------

/**
 * Analyze collected window globals and flag auth-related data.
 *
 * This is a pure function: takes data in, returns structured results.
 * The heavy lifting (enumerating window properties, filtering browser
 * builtins, extracting top-level keys) happens in a page script run by
 * the orchestrator. This module classifies the results.
 */
const detectGlobals = (input: GlobalsDetectionInput): GlobalsAnalysis => {
  const globals: GlobalInfo[] = input.globals.map(g => ({
    path: g.path,
    type: g.type,
    hasAuthData: containsAuthKeys(g.topLevelKeys),
    topLevelKeys: g.topLevelKeys,
  }));

  return { globals };
};

export type { GlobalInfo, GlobalProperty, GlobalsAnalysis, GlobalsDetectionInput };
export { detectGlobals };
