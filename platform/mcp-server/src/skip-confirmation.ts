/**
 * Confirmation bypass detection — determined once at startup.
 *
 * The --dangerously-skip-confirmation flag (or OPENTABS_SKIP_CONFIRMATION=1
 * env var) bypasses all browser tool confirmation prompts. This is a
 * dangerous option that disables human-in-the-loop safety for sensitive
 * browser operations. It exists for CI/testing environments where no human
 * is available to approve tool calls.
 *
 * The config.json `skipConfirmation` field is checked separately at reload
 * time and combined with this flag in state.skipConfirmation.
 */

const cliSkipConfirmation =
  process.argv.includes('--dangerously-skip-confirmation') || process.env['OPENTABS_SKIP_CONFIRMATION'] === '1';

/** Whether the CLI flag or env var requests confirmation bypass */
export const isCliSkipConfirmation = (): boolean => cliSkipConfirmation;
