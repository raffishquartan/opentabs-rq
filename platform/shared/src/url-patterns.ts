/**
 * Chrome match-pattern matching, shared by the Chrome extension (tab matching,
 * adapter injection) and the MCP server (plugin homepage checks). Pure and
 * browser-safe: import it via the `@opentabs-dev/shared/url-patterns` subpath.
 */

/**
 * Checks if a URL matches any of the given Chrome match patterns,
 * optionally excluding URLs that match any exclude pattern.
 *
 * @param url - The full URL to test (e.g., `https://app.slack.com/client`)
 * @param patterns - Chrome extension match patterns to test against
 * @param excludePatterns - Optional patterns; if the URL matches any, returns `false`
 * @returns `true` if the URL matches at least one include pattern and no exclude pattern
 */
export const urlMatchesPatterns = (url: string, patterns: string[], excludePatterns?: string[]): boolean => {
  let matched = false;
  for (const pattern of patterns) {
    if (matchPattern(url, pattern)) {
      matched = true;
      break;
    }
  }
  if (!matched) return false;
  if (excludePatterns) {
    for (const pattern of excludePatterns) {
      if (matchPattern(url, pattern)) return false;
    }
  }
  return true;
};

/**
 * Tests a single URL against a Chrome extension match pattern.
 *
 * Pattern format: `<scheme>://<host>[:<port>]/<path>` where scheme is
 * `*`, `http`, `https`, or `ftp`; host supports `*` (any host) and
 * `*.domain` (subdomain wildcard); path supports `*` as a glob.
 *
 * Examples:
 * - `*://localhost:9516/*` matches `http://localhost:9516/anything`
 * - `*://*.slack.com/*` matches `https://app.slack.com/anything`
 * - `http://example.com/*` matches `http://example.com/anything`
 *
 * @param url - The full URL to test
 * @param pattern - A Chrome extension match pattern string
 * @returns `true` if the URL matches the pattern
 */
export const matchPattern = (url: string, pattern: string): boolean => {
  const matchResult = pattern.match(/^(\*|https?|ftp):\/\/(.+?)(\/.*)$/);
  if (!matchResult?.[1] || !matchResult[2] || !matchResult[3]) return false;

  const [, scheme, hostWithPort, path] = matchResult;

  // Separate host and optional port from the pattern's host portion.
  // Examples: "localhost:9516" → host="localhost", port="9516"
  //           "*.slack.com"   → host="*.slack.com", port=""
  //           "*"             → host="*", port=""
  let patternHost: string;
  let patternPort: string;
  const colonIdx = hostWithPort.lastIndexOf(':');
  // Only split on colon if what follows looks like a port number (all digits)
  // and the host isn't just "*" — avoids misinterpreting IPv6 or *.host:port
  if (colonIdx > 0 && /^\d+$/.test(hostWithPort.slice(colonIdx + 1))) {
    patternHost = hostWithPort.slice(0, colonIdx);
    patternPort = hostWithPort.slice(colonIdx + 1);
  } else {
    patternHost = hostWithPort;
    patternPort = '';
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Scheme match
  if (scheme !== '*' && parsed.protocol !== `${scheme}:`) return false;
  if (scheme === '*' && !['http:', 'https:'].includes(parsed.protocol)) return false;

  // Port match — if the pattern specifies a port, the URL must have that port.
  // URL.port is "" for default ports (80 for http, 443 for https).
  if (patternPort) {
    if (parsed.port !== patternPort) return false;
  }

  // Host match
  if (patternHost !== '*') {
    if (patternHost.startsWith('*.')) {
      const suffix = patternHost.slice(2);
      if (parsed.hostname !== suffix && !parsed.hostname.endsWith(`.${suffix}`)) return false;
    } else {
      if (parsed.hostname !== patternHost) return false;
    }
  }

  // Path match — convert glob to regex
  if (path !== '/*') {
    const pathRegex = new RegExp(`^${path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    if (!pathRegex.test(parsed.pathname)) return false;
  }

  return true;
};
