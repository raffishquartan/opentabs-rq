/**
 * Sanitize successful tool output before returning to MCP clients.
 *
 * Applies the same path, URL, localhost, and IP replacement patterns
 * as sanitizeErrorMessage (from sanitize-error.ts) but operates
 * recursively on all string values within an object tree. Numbers,
 * booleans, nulls, and object keys are left untouched.
 *
 * This prevents internal system details (filesystem paths, local IP
 * addresses) from leaking to AI agents in tool output. Error messages
 * are sanitized separately by sanitizeErrorMessage and are not affected
 * by the skipSanitization flag.
 */

const MAX_DEPTH = 50;

/**
 * Sanitize a single string value using the same patterns as sanitizeErrorMessage.
 * Does NOT truncate — tool output can be arbitrarily long (truncation is only
 * for error messages where brevity matters).
 */
const sanitizeString = (value: string): string =>
  value
    // Windows absolute paths: C:\path\to\file or C:/path/to/file
    .replace(/[a-z]:[/\\][^\s,;)}\]]+/gi, '[PATH]')
    // Unix absolute paths: /path/to/file (at least 2 segments to avoid false positives like "/")
    .replace(/\/[a-z0-9._-]+(?:\/[a-z0-9._-]+)+/gi, '[PATH]')
    // Full URLs with protocol
    .replace(/https?:\/\/[^\s,;)}\]]+/gi, '[URL]')
    // localhost with port
    .replace(/localhost:\d+/gi, '[LOCALHOST]')
    // IPv4 addresses
    .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]');

/**
 * Recursively sanitize all string values within an object.
 * Leaves numbers, booleans, nulls, and object keys unchanged.
 */
const sanitizeToolOutput = (obj: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) return obj;

  if (typeof obj === 'string') return sanitizeString(obj);
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeToolOutput(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = sanitizeToolOutput(value, depth + 1);
  }
  return result;
};

export { sanitizeToolOutput };
