# Gate: do the fork's screenshot branches add anything upstream lacks?

Compared 2026-11-27 against `main` = upstream tag v0.0.115 (read-only `git show` and `git grep` over `platform/mcp-server/src` and `platform/cli/src`, test files excluded).

| Capability | Upstream v0.0.115 | `f/screenshot-tab-integrated` |
|---|---|---|
| `filePath` option writing the PNG server-side and returning `{savedTo, bytes}` | present | present |
| Default return as an MCP image content part | missing (default returns a JSON object whose `image` field is a base64 string, delivered to the model as text) | present |
| `formatResult` hook on browser tool definitions | missing (no match) | present (`definition.ts`) |
| `ToolContentPart` content-part typing through `mcp-tool-dispatch.ts` | missing (no match) | present |
| CLI `tool call` rendering of image parts | missing | present (`platform/cli/src/commands/tool.ts`) |
| `filePath` I/O-error unit test | to be confirmed during the rebase (cherry-pick only if absent) | present |

## Measured baseline on upstream (live server running upstream's tool, a harmless test page)

- With `filePath`: one tool call; PNG written 2912 x 1806, 205383 bytes; the agent receives only `{savedTo, bytes}` and cannot see the image without reading the file back.
- Without `filePath`: the tool output is 273862 bytes of base64 text inside JSON. A model receives that as text, not as an image: it cannot view the screenshot and the text consumes a large part of its context window.

## Decision: KEEP

The fork's integration branch adds real functionality missing upstream: a screenshot returned without `filePath` becomes an image the model can actually see, instead of an unreadable base64 text blob, and the CLI renders it. The `filePath` path (the one the `archive-correspondence` skill uses) is the same in both. The user's rule is to merge into `exec-branch` only if the work adds real functionality upstream lacks; it does, so tasks 2 and 3 proceed. Task 2.6 still compares the skill's flow with and without the fork branch.
