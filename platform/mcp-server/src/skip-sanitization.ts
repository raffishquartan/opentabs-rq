/**
 * Output sanitization bypass detection — determined once at startup.
 *
 * The --dangerously-skip-sanitization flag (or OPENTABS_SKIP_SANITIZATION=1
 * env var) disables path/IP sanitization of successful tool output. This is
 * useful when raw output is needed for debugging or when the AI agent needs
 * actual filesystem paths.
 *
 * Error message sanitization (via sanitizeErrorMessage) is never affected
 * by this flag — errors are always sanitized regardless.
 *
 * The config.json `skipSanitization` field is checked separately at reload
 * time and combined with this flag in state.skipSanitization.
 */

const cliSkipSanitization =
  Bun.argv.includes('--dangerously-skip-sanitization') || Bun.env.OPENTABS_SKIP_SANITIZATION === '1';

/** Whether the CLI flag or env var requests output sanitization bypass */
export const isCliSkipSanitization = (): boolean => cliSkipSanitization;
