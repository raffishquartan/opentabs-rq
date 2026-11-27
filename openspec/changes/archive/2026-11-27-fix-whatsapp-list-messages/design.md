## Context

Code references are to the tree after the fork is synced to upstream v0.0.115, where `plugins/whatsapp/package.json` is 0.0.88 (npm and the live installation have 0.0.89, from an upstream auto-bump commit after the tag) and its `src/` is identical across 0.0.84 to 0.0.89.

`loadMessages` (`plugins/whatsapp/src/whatsapp-api.ts:273`) fetches the internal module `WAWebChatLoadMessages` via `waRequire`, calls `loadEarlierMsgs(chat)` once regardless of how many messages are held locally, and returns `chat.msgs.getModelsArray()` unsorted. The string `waitForChatLoading` does not appear in the plugin source, so the failure originates inside WhatsApp's own module when invoked as the plugin invokes it. `serializeMessage` (`:233`) returns `body` raw, `t` as Unix seconds, and `from`/`to`/`author` JIDs with no names; `serializeMessage` and the message schema are used only by `list_messages`. The plugin has no tests, and no plugin in the repo has a test setup; `tsconfig.json` includes all of `src` and the package publishes `dist`. The live installation runs the npm package, not a local build; `opentabs-plugin build` registers the plugin in `localPlugins`, which overrides npm. A version change resets the plugin to `off` and deletes its per-tool overrides (`reload.ts`, `resetStaleReviewedVersions`).

## Goals / Non-Goals

**Goals:**
- Working `list_messages` with captions, London time, sender and media type.
- Degrade to locally held messages, with the cause visible, if history loading breaks again.
- Tests runnable without a browser and excluded from the published build.

**Non-Goals:**
- Replacing other message sources or building a general WhatsApp scraper.
- DOM-scrolling virtualised rows (kept only as a documented fallback if no module path works).
- Changing other WhatsApp tools; upstreaming the fix in this change.

## Decisions

- **Diagnose on a live tab first.** Use the open WhatsApp Web tab (`plugin_analyze_site` / `browser_execute_script`, short calls only; long loops hung the transport per the originating message) to find what the history-loading module now exports and what the failing call needs. Findings go into private session notes; the PR records only module names and shapes, never message content. Alternative: patch blind; rejected because the module surface is private.
- **Bounded history loop.** While fewer than `limit` messages are held, call the loader again, stopping when `limit` is reached, a call adds no messages, or 10 calls have run. Each call is short (one page); `loadMessages` takes the tool's `reportProgress` callback so progress is reported per call. Messages are sorted by `t` ascending (ties by id) and the last `limit` returned.
- **Best-effort loader with visible cause.** A loader failure (module missing, export missing, call throws) stops the loop and returns the messages held, with `history_complete: false`, `history_error: <message>`, and a `log.warn` with the same text. `history_complete` is defined as "no loader error occurred", so it is true when held messages already sufficed and no load ran. This is boundary code against an unstable third-party surface, and the cause is surfaced, not swallowed. Chat lookup failures are not caught: an unknown chat keeps its existing not-found error.
- **Pure serialization functions** taking plain objects, so unit tests need no WhatsApp module.
- **Output fields.** Keep `id`, `from_me`, `timestamp` (UTC Unix seconds) and the other existing fields except `body`. Add `timestamp_local`: ISO 8601 with seconds and numeric offset in Europe/London, for example `2026-07-01T12:00:00+01:00`, built from `Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', ... }).formatToParts` plus an offset computed from the zone parts (no new dependency). Add `text`: the caption for image, video and document messages, the body for text messages, and empty for all other types (voice notes, audio, stickers, locations, contact cards), so binary or thumbnail data never appears. Add `media_type`: `null` for text messages (`type` `chat`), otherwise the raw WhatsApp message type, not a normalised name (for example `image`, `video`, `document`, `ptt` for a voice note, `sticker`, `location`). It duplicates the retained `type` field except for the null case, which makes "is this media" a single check. Add `sender` and `sender_name`: the author JID in groups, the other party's JID for incoming 1:1 messages, and the user's own JID for `from_me` messages; the name is the contact's saved `name`, else `pushname`, else the message's own `notifyName` (push name), else `shortName`, else empty. Drop `body`; no compatibility shim.
- **Tool description** stays under 1000 characters (longer descriptions make the loader reject the plugin's `tools.json`); a test enforces it.
- **Test setup.** Tests live in `src/**/*.test.ts`; `tsconfig.json` excludes them so they are neither emitted nor published; `tsconfig.test.json` includes them for type-checking; vitest is a devDependency; `npm test` runs `vitest run`; the plugin `check` script and `type-check` cover both configs. Plugins are excluded from root lint, knip and `tsc --build`, so verification is plugin-level.
- **Version and deployment.** Version 0.1.0: above both the repo's 0.0.88 and npm's 0.0.89, a minor bump for the breaking output change under 0.x, and the version change that triggers re-review. This plugin-only bump is unrelated to platform versions, which the fork never bumps. Building registers the plugin directory as local, overriding npm; accepted by the user and recorded in the PR. The build runs in the primary checkout on `exec-branch`, never in a feature worktree that is later removed, so the registered path stays valid.
- **Branching and delivery.** `f/fix-whatsapp-list-messages` off `main`; pushed to the fork and optionally opened as a PR for review only, never merged into the fork's `main`; merged into `exec-branch` for deployment. This change folder is the branch's first commit (copied from the holding folder outside the repository); its tasks are ticked and it is archived on this branch, so it reaches `exec-branch` with the code.
- **Checks.** This is a plugin-only change: plugin-level checks (`npm run check` in `plugins/whatsapp`) are the gate, because plugins are excluded from root build, lint, knip and type-check. Root checks run only if a platform file changes.
- **Permissions after re-review.** The plugin returns to `ask` via `plugin_mark_reviewed`; the four read-only tools (`list_messages`, `list_chats`, `get_chat`, `get_current_user`) get per-tool `auto` again. The plugin is never set to `auto` as a whole, because it also has destructive tools.

## Risks / Trade-offs

- [WhatsApp renames modules again] -> loader failure is non-fatal and its cause appears in `history_error` and the log.
- [Caption and author field names unverified] -> confirmed on the live tab before coding; test fixtures mirror the observed shapes.
- [Page size per loader call unknown] -> the loop handles any size; the 10-call cap bounds runtime.
- [Plugin cannot be end-to-end tested in CI] -> unit tests cover serialization and loading logic; "done" is verified manually against a designated test group chat.
- [Local plugin no longer follows npm] -> recorded; reverting means removing the `localPlugins` entry.

## Open Questions

Defaults applied while the user was unavailable; each can be overturned:

- D4: `timestamp_local` uses a fixed Europe/London zone (alongside UTC `timestamp`), not the system zone or a plugin setting.
- D5: plugin-level checks only; root checks run only if a platform file changes.
- D1: delivery is a review-only PR plus `exec-branch` merge, never a merge into the fork's `main`.
- OpenSpec location (user decision, round 3): this change folder is committed on `f/fix-whatsapp-list-messages` with the code, not on `f/openspec`.

Other:

- Whether a module-level loader exists in the current bundle at all, or the DOM-scroll fallback becomes the primary path (answered by task 1.3; changes implementation tasks, not the spec).
