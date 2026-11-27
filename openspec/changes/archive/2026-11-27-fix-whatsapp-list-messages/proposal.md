## Why

`whatsapp__list_messages` fails with `Cannot read properties of undefined (reading 'waitForChatLoading')` after a WhatsApp Web update changed an internal module the plugin calls. The tool is the fallback when another message source misses messages or media CDN URLs expire, so without it the only route is manual WhatsApp Web scraping. Separately, the tool returns the raw `body` (for media messages WhatsApp Web stores a base64 thumbnail there, not the caption) and a UTC Unix timestamp, so even a working call does not give captions and local times.

## What Changes

- Built on the plugin source after the fork sync (`plugins/whatsapp` is 0.0.88 at upstream tag v0.0.115; npm has 0.0.89; `src/` is identical across 0.0.84 to 0.0.89, so the loader is still broken).
- Repair message loading so `whatsapp__list_messages` works against the current WhatsApp Web bundle, with a bounded history-loading loop and chronological ordering.
- If history loading fails, return the locally held messages with `history_complete: false` and the cause in `history_error`, instead of failing; `history_complete` means no loader error occurred (true when no load was needed).
- Return per message: sender id and resolved name, Europe/London local time as an ISO 8601 string with offset, text including media captions, and media type. Stop returning thumbnail data.
- Add the plugin's first unit tests, with a test setup that keeps tests out of the published build.
- Set the plugin version to 0.1.0 (above both the repo's 0.0.88 and npm's 0.0.89; breaking output change; the bump also triggers the required re-review). Building it registers WhatsApp as a local plugin that overrides the npm package, so upstream npm updates stop applying until the local entry is removed; the user accepts this.
- After re-review, keep the plugin permission at `ask` and restore the four read-only per-tool `auto` overrides.

## Capabilities

### New Capabilities
- `whatsapp-message-listing`: behaviour contract for `whatsapp__list_messages` (loading, ordering, fields, time zone, captions, failure behaviour).

### Modified Capabilities

## Impact

- `plugins/whatsapp/src/whatsapp-api.ts`, `src/tools/list-messages.ts`, `src/tools/schemas.ts`, new test files, `tsconfig.json`, new `tsconfig.test.json`, `package.json` (version, `test` script, `check` script, vitest devDependency).
- Output schema of `whatsapp__list_messages` changes (**BREAKING** for callers reading `body`); the known consumers are agent sessions, which read the updated tool description.
- No platform server or extension change. Delivered on `f/fix-whatsapp-list-messages` off `main`, pushed to the fork and optionally opened as a PR for review only (never merged into the fork's `main`), then merged into `exec-branch`. Deploy: `npm run build` in the plugin in the primary checkout on `exec-branch` (registers that path in `localPlugins` and triggers `POST /reload`), then re-review and permission restore.
