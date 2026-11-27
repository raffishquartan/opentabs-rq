## 1. Branch and diagnose

- [x] 1.1 Create `f/fix-whatsapp-list-messages` from the synced `main` (v0.0.115), copy `openspec/changes/fix-whatsapp-list-messages/` from the holding folder and commit it as the branch's first commit. Verify: `git merge-base f/fix-whatsapp-list-messages main` equals `main`; `openspec validate fix-whatsapp-list-messages` passes on the branch; the privacy grep over the folder has no hits.
- [x] 1.2 Confirm `plugins/whatsapp/package.json` is 0.0.88 and run `npm install` in `plugins/whatsapp`. Verify: install exits 0.
- [x] 1.3 On the open WhatsApp Web tab, reproduce the `waitForChatLoading` error and identify the current exports and call shape of the history-loading module, and the page size of one load, using short calls only. Verify: module names and shapes recorded in the PR description; no message content or chat names there.
- [x] 1.4 Identify the caption, author and contact-name fields on a media message, a group message and an own message in a designated test group chat. Verify: field names recorded in private session notes and mirrored as anonymised test fixtures.

## 2. Test setup

- [x] 2.1 Exclude `src/**/*.test.ts` from `tsconfig.json`, add `tsconfig.test.json` including them, add vitest as a devDependency, add `"test": "vitest run"`, and add the test config and `npm test` to the `type-check` and `check` scripts. Verify: `npm test` runs a real first test; `npm run build` leaves no test files in `dist/`.

## 3. Implementation

- [x] 3.1 Extract pure serialization: `timestamp_local`, `text`, `media_type`, `sender`, `sender_name`; drop `body`. Verify tests (failing first): summer, winter, both DST-transition pairs with exact strings; captioned and uncaptioned image; voice note (`ptt`), sticker and location give empty `text` and raw `media_type`; plain text gives null `media_type`; group author, incoming 1:1 from an unsaved contact, own message; name fallback order.
- [x] 3.2 Replace the loader with the bounded loop (stop on limit, no progress, or 10 loads), passing the tool's `reportProgress` into `loadMessages` to report per load, then sort by `t` then id and return the last `limit`. Verify tests: several loads to reach 100 with progress per load; stop on no progress; stop at the cap; no load when enough are held; unsorted input returned oldest first.
- [x] 3.3 Make loader failure return held messages with `history_complete: false`, `history_error` and a `log.warn`; leave chat lookup errors uncaught. Verify tests: loader missing; loader throws with messages held; loader throws with none held; success and no-load-needed both give `history_complete: true` and no `history_error`; unknown chat keeps the not-found error.
- [ ] 3.4 Update `list-messages.ts` and `schemas.ts` output and description. Verify: a test asserts the description is under 1000 characters.
- [ ] 3.5 Update the plugin README for the new fields.

## 4. Verification and release

- [ ] 4.1 Set `plugins/whatsapp/package.json` version to 0.1.0 (above the repo's 0.0.88 and npm's 0.0.89). Verify: `cd plugins/whatsapp && npm run check` exits 0 (build, type-check including tests, lint, format, test). This is a plugin-only change, so plugin-level checks are the gate; run the six root checks only if a platform file changed.
- [ ] 4.2 Push the branch to the fork's `origin`; optionally open a PR for review only (never merged into `main`). Record in it that building registers WhatsApp in `localPlugins`, overriding the npm package so npm updates stop applying until the entry is removed.
- [ ] 4.3 Rebuild `exec-branch` per `CLAUDE.fork.md` with this branch merged, then run `npm install && npm run build` in `plugins/whatsapp` in the primary checkout on `exec-branch` (never in a feature worktree). Verify: `localPlugins` contains the primary checkout's plugin path and the server reports version 0.1.0.
- [ ] 4.4 Call `plugin_inspect`, ask the user for the 8-digit confirmation, then `plugin_mark_reviewed` with permission `ask` (never `auto`). Verify: plugin permission is `ask`.
- [ ] 4.5 Restore the per-tool overrides with `node <primary-checkout>/platform/cli/dist/cli.js config set tool-permission.whatsapp.<tool> auto` for `list_messages`, `list_chats`, `get_chat` and `get_current_user`. Verify: `config show` lists exactly those four as `auto` and the plugin at `ask`.
- [ ] 4.6 Call `whatsapp__list_messages` on the designated test group chat. Verify: the last 20 messages return oldest first with captions, `timestamp_local` values and sender names; no message content is copied into the PR.
