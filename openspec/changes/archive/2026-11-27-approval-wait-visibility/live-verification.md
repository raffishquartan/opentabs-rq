## Live verification (2026-11-27, `exec-branch` build, version 0.0.115)

Real Claude Code session (2.1.332) against the live server; the `ask` plugin call was a read-only listing with limit 1, `approvalTimeoutSeconds` unset (0).

- The call waited for the side-panel decision for several minutes without being cancelled by the client. After 120 s Claude Code moved the call to a background task and kept waiting; the result arrived when the prompt was approved. No client-side give-up was observed, so the unanswered approval no longer ends the session's tool call.
- The prompt stayed in the side panel for the whole wait and was withdrawn on approval.
- The heartbeat notices are MCP progress notifications, which the Claude Code UI does not display, so they were not observed from the client side; they are covered by the dispatch unit tests (10 s interval, elapsed and remaining time, interval cleared on every settlement).
- `MCP_TOOL_TIMEOUT` was not set in the session environment.
