## Why

The fork carries three screenshot branches made before the sync: `f/restore-screenshot-tab-filepath` (a test for the `filePath` option), `f/screenshot-image-content-part-v2` (returns `browser_screenshot_tab` as an MCP image content part, adds a `formatResult` hook to browser tool definitions, and renders image parts in the CLI `tool call` output) and `f/screenshot-tab-integrated` (the two combined). `sync-fork-with-upstream` leaves them untouched and off `exec-branch`, so until this change the live `browser_screenshot_tab` is upstream's. The user asked to do this work after the rate-limit change and to merge it into `exec-branch` only if it adds real functionality missing from upstream. A read-only check during planning found that upstream v0.0.115 already has `filePath` (base64 JSON by default, `{savedTo, bytes}` with `filePath`) but has no image content part, no `formatResult` hook and no CLI image rendering; the gate in this change repeats that check against the code current at the time.

## What Changes

- Gate first: compare the screenshot branches against the then-current `main` (upstream release tag). If upstream already provides the image content part and CLI rendering (or equivalent), drop the work: nothing is merged into `exec-branch`, and the decision is recorded.
- If kept: recreate `f/screenshot-tab-integrated` on the then-current `main` carrying the image content part, the `formatResult` hook, the CLI image rendering and the `filePath` path, plus the extra `filePath` test if upstream lacks it; resolve the `mcp-tool-dispatch.ts` conflict with `approval-wait-visibility` (`ToolCallResult.content` becomes `ToolContentPart[]`); regenerate the browser tools catalog; run the six checks; merge into `exec-branch` after `f/mcp-rate-limit-retryable-status`.
- The old branches `f/restore-screenshot-tab-filepath` and `f/screenshot-image-content-part-v2` are not rebased; their work is folded into the recreated integration branch, and their remote branches are left for the user to delete.

- Test the `archive-correspondence` skill with and without the fork's screenshot change (baseline task 1.3, comparison task 2.6): does it produce better screenshots than upstream's tool alone, or give a different functional benefit (for example the agent seeing the captured image inline to confirm the capture is complete)? The result feeds the keep-or-drop decision.

## Capabilities

### New Capabilities
- `screenshot-image-content`: the shape of `browser_screenshot_tab` results (MCP image content part by default, file write with `filePath`) and how the CLI renders image content parts. Applies only if the gate keeps the work.

### Modified Capabilities

## Impact

- If kept: `platform/mcp-server` (`browser-tools/screenshot-tab.ts`, `browser-tools/definition.ts`, `mcp-tool-dispatch.ts`, `mcp-gateway.ts`, their tests), `platform/shared/src/generated/browser-tools-catalog.ts` (regenerated), `platform/cli/src/commands/tool.ts` and its test, e2e screenshot tests.
- If dropped: no code change; the folder is archived with the decision recorded.
- Delivered on `f/screenshot-tab-integrated` (force-pushed after user confirmation if kept), pushed to the fork and optionally opened as a PR for review only (never merged into the fork's `main`). No version bump: platform versions are owned by upstream's release process and the fork never tags or publishes. Sequenced last, after `mcp-rate-limit-retryable-status`.

## Baseline measured 2026-11-27 (task 1.3)

On the live server with upstream's tool, screenshotting a harmless page: with `filePath` one call wrote a 2912 x 1806 PNG (205383 bytes) and returned `{savedTo, bytes}` (the agent cannot view it without reading the file back); without `filePath` the output was 273862 bytes of base64 text. The `archive-correspondence` skill's primary path uses `filePath`, so file quality is the same with or without the fork change; see `gate.md`.
