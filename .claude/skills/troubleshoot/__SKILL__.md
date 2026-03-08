# Troubleshoot — OpenTabs Diagnostic Workflow

Diagnose and resolve OpenTabs platform issues using a systematic 8-step workflow, followed by a comprehensive error reference.

If the user reported a specific error, focus on the matching step and error reference entry. Otherwise, run a general health check starting from Step 1.

---

## Quick Diagnosis

Before diving into specific steps, run these diagnostic commands:

```bash
opentabs status      # Server, extension, and plugin state
opentabs doctor      # Comprehensive setup diagnostics
```

From your AI client:
- Call `extension_get_state` — extension health and WebSocket status
- Call `plugin_list_tabs` — per-plugin tab readiness

---

## Step 1: Check Extension Connectivity

```
extension_get_state
```

Verify the response shows the WebSocket is connected. Key fields to check:
- `connected`: must be `true`
- `tabCount`: number of tracked tabs
- `injectedAdapters`: plugins with adapters injected into tabs

**If the extension is not connected:**
1. Verify the Chrome extension is loaded: the user should check `chrome://extensions/` and confirm OpenTabs is enabled
2. Verify the MCP server is running: `opentabs status`
3. Check if the extension needs to be reloaded: the user should click the refresh icon on the OpenTabs extension card at `chrome://extensions/`
4. Check if the side panel is open — opening the OpenTabs side panel triggers the WebSocket connection
5. If the extension was recently updated, the user needs to reload it and reopen the side panel
6. Check for stale auth secret: `opentabs config rotate-secret --confirm`, then reload extension

---

## Step 2: Check Plugin State and Tab Readiness

```
plugin_list_tabs
```

This returns all loaded plugins with their tab states. For each plugin, verify:
- **state**: `ready` means a matching tab is open and the plugin's `isReady()` returned true
- **state**: `unavailable` means a matching tab exists but `isReady()` returned false (auth issue, page still loading)
- **state**: `closed` means no tab matches the plugin's URL patterns

**If the target plugin is not listed:**
- The plugin may not be installed: `opentabs plugin list`
- The plugin may have failed to load: check `opentabs logs` for discovery errors

**If state is `closed`:**
- The user needs to open the web app in a browser tab
- The URL must match the plugin's URL patterns

**If state is `unavailable`:**
- The user may not be logged in to the web app
- The page may still be loading — wait a few seconds and re-check
- The plugin's `isReady()` function may have a bug

---

## Step 3: Check Plugin Permissions

If the error mentions "not reviewed" or "permission":

**Plugin not reviewed (permission is `off`):**
1. Call `plugin_inspect` with the plugin name to retrieve the adapter source code and a review token
2. Review the code for security concerns (network requests, data access, DOM manipulation)
3. Ask the user to confirm the review
4. Call `plugin_mark_reviewed` with the plugin name, version, review token, and desired permission (`ask` or `auto`)

**Permission denied (user rejected approval):**
- In `ask` mode, the user sees an approval dialog for each tool call. If they click "Deny", the tool returns a permission error
- To avoid repeated prompts, the user can set the permission to `auto`:
  ```bash
  opentabs config set plugin-permission.<plugin> auto
  ```
- Or set per-tool permissions:
  ```bash
  opentabs config set tool-permission.<plugin>.<tool> auto
  ```

---

## Step 4: Check for Timeout Issues

If the error mentions "timeout" or "timed out":

- The default dispatch timeout is 30 seconds. Tools that report progress get an extended window (timeout resets on each progress update, up to 5 minutes max)
- Check if the tool is a long-running operation (e.g., large data export, file upload)
- Check if the target web app is slow to respond — use `browser_get_network_requests` to inspect API latency
- Check if the extension adapter is responsive:
  ```
  extension_check_adapter(plugin: "<plugin-name>")
  ```

---

## Step 5: Check for Rate Limiting

If the error mentions "rate limit" or includes `retryAfterMs`:

- The target web app's API is throttling requests
- Wait for the `retryAfterMs` duration before retrying
- Reduce the frequency of tool calls to the affected plugin
- Check if the web app has a rate limit dashboard or API usage page

---

## Step 6: Check for Tool Not Found

If the error mentions "tool not found" or "unknown tool":

- Verify the tool name uses the correct prefix: `<plugin>_<tool>` (e.g., `slack_send_message`)
- Check if the plugin is installed and loaded: `plugin_list_tabs`
- The plugin may have been updated and the tool renamed — check the plugin's tool list

---

## Step 7: Inspect Server and Extension Logs

For deeper diagnosis, check the logs:

```
extension_get_logs
```

This returns recent extension logs including adapter injection events, WebSocket messages, and errors. Look for:
- Adapter injection failures (CSP violations, script errors)
- WebSocket disconnection events
- Tool dispatch errors

Also check the MCP server logs:
```bash
opentabs logs
```

---

## Step 8: Browser-Level Diagnostics

If the issue persists, use browser tools for deeper investigation:

```
browser_get_console_logs(tabId: <tabId>)
```

Check for JavaScript errors in the target web app's console.

```
browser_enable_network_capture(tabId: <tabId>, urlFilter: "/api")
```

Then reproduce the issue and check captured network requests:

```
browser_get_network_requests(tabId: <tabId>)
```

Look for failed API calls (4xx/5xx responses), CORS errors, or network timeouts.

---

## Quick Reference: Common Errors

| Error | Likely Cause | Resolution |
|-------|-------------|------------|
| Extension not connected | Extension not loaded or side panel closed | Reload extension, open side panel |
| Tab closed | No matching tab open | Open the web app in a browser tab |
| Tab unavailable | User not logged in or page loading | Log in, wait, re-check |
| Plugin not reviewed | Permission is `off` | Run the review flow (inspect -> review -> mark reviewed) |
| Permission denied | User rejected approval dialog | Set permission to `auto` via CLI |
| Dispatch timeout | Tool or API too slow | Check network, increase timeout, check adapter |
| Rate limited | API throttling | Wait for retryAfterMs, reduce call frequency |
| Tool not found | Wrong name or plugin not loaded | Verify plugin installed and tool name correct |
| Concurrent dispatch limit | 5 active dispatches per plugin | Wait for in-flight tools to complete |

---

## Error Reference

### Extension Not Connected

**Error:** `Extension not connected. Please ensure the OpenTabs Chrome extension is running.`

**Cause:** The Chrome extension WebSocket connection to the MCP server is not active.

**Resolution:**
1. Verify server is running: `opentabs status`
2. Check extension is loaded: open `chrome://extensions`, verify OpenTabs is enabled
3. Reload extension: click the refresh icon on the OpenTabs card in `chrome://extensions`
4. Close and reopen the side panel
5. If still failing, run `opentabs doctor` for full diagnostics
6. Check for stale auth secret: `opentabs config rotate-secret --confirm`, then reload extension

### Tab Closed

**Error:** `Tab closed: <message>`

**Cause:** No browser tab matches the plugin's URL patterns, or the matching tab was closed during dispatch.

**Resolution:**
1. Open the target web application in Chrome
2. Verify the URL matches the plugin's `urlPatterns` (`opentabs status` shows patterns)
3. Call `plugin_list_tabs` to verify the tab is detected
4. Retry the tool call

### Tab Unavailable

**Error:** `Tab unavailable: <message>`

**Cause:** A tab matches the plugin's URL patterns but `isReady()` returns false. The user is likely not logged in.

**Resolution:**
1. Log into the web application in the matching browser tab
2. Refresh the tab (Ctrl+R / Cmd+R)
3. Wait 5 seconds for the readiness probe to complete
4. Call `plugin_list_tabs` to check the `ready` field
5. Retry the tool call

### Plugin Not Reviewed

**Error:** `Plugin "<name>" (v<version>) has not been reviewed yet.`

**Cause:** New plugins start with permission `'off'` and require a security review before use.

**Resolution (AI client flow):**
1. Call `plugin_inspect({"plugin": "<name>"})` — retrieves adapter source code + review token
2. Review the code for security concerns (data exfiltration, credential access, suspicious network requests)
3. Share findings with the user
4. If approved, call `plugin_mark_reviewed({"plugin": "<name>", "version": "<ver>", "reviewToken": "<token>", "permission": "auto"})`

**Resolution (side panel):** Open the side panel, click the shield icon on the plugin card, and confirm.

### Plugin Updated — Re-Review Required

**Error:** `Plugin "<name>" has been updated from v<old> to v<new> and needs re-review.`

**Cause:** Plugin version changed since last review. Permission resets to `'off'` on version change.

**Resolution:** Same as "Plugin Not Reviewed" above — call `plugin_inspect` and re-review.

### Tool Disabled

**Error:** `Tool "<name>" is currently disabled. Ask the user to enable it in the OpenTabs side panel.`

**Cause:** The tool's permission is set to `'off'`.

**Resolution:**
- User enables in side panel, OR
- `opentabs config set tool-permission.<plugin>.<tool> ask`
- `opentabs config set plugin-permission.<plugin> ask`

### Permission Denied by User

**Error:** `Tool "<name>" was denied by the user.`

**Cause:** Tool permission is `'ask'` and the user clicked "Deny" in the approval dialog.

**Resolution:** Do NOT retry immediately. Ask the user if they want to approve the action. To skip future prompts: `opentabs config set tool-permission.<plugin>.<tool> auto`

### Too Many Concurrent Dispatches

**Error:** `Too many concurrent dispatches for plugin "<name>" (limit: 5). Wait for in-flight requests to complete.`

**Cause:** More than 5 simultaneous tool calls to the same plugin.

**Resolution:** Wait 100-500ms for in-flight dispatches to complete, then retry.

### Dispatch Timeout

**Error:** `Dispatch <label> timed out after <ms>ms`

**Cause:** Tool handler did not respond within 30 seconds (or 5 minutes with progress reporting).

**Resolution:**
1. Check if the tab is responsive (take a screenshot, check console logs)
2. Refresh the target tab if unresponsive
3. For legitimately long operations, the plugin should use `context.reportProgress()` to extend the timeout
4. Break long operations into multiple tool calls

**Timeout rules:**
- Default: 30s per dispatch
- Progress resets the timer: each `reportProgress()` call extends by 30s
- Absolute ceiling: 5 minutes regardless of progress

### Schema Validation Error

**Error:** `Invalid arguments for tool "<name>": - <field>: <issue>`

**Cause:** Tool arguments don't match the JSON Schema defined by the plugin.

**Resolution:** Check the tool's input schema via `tools/list` and ensure all required fields are provided with correct types.

### Tool Not Found

**Error:** `Tool <name> not found`

**Cause:** The prefixed tool name doesn't exist in the registry. Plugin may not be installed.

**Resolution:**
1. Run `opentabs status` to verify the plugin is installed
2. Check the tool name (format: `<plugin>_<tool>`, e.g., `slack_send_message`)
3. Reinstall: `opentabs plugin install <name>`

### Rate Limited

**Error:** Tool response includes `retryable: true` and `retryAfterMs`.

**Cause:** The target web application's API returned HTTP 429.

**Resolution:** Wait the specified `retryAfterMs` before retrying. The `ToolError.rateLimited` metadata includes the exact delay.

---

## Diagnostic Tools Reference

| Tool | What it checks |
|------|---------------|
| `extension_get_state` | WebSocket status, registered plugins, active captures |
| `extension_get_logs` | Extension background script logs, injection warnings |
| `extension_check_adapter({"plugin": "<name>"})` | Adapter injection status, hash match, isReady() result |
| `plugin_list_tabs` | Per-plugin tab matching and readiness |
| `browser_get_console_logs` | Browser console errors (requires network capture) |
| `opentabs status` | Server uptime, extension connection, plugin states |
| `opentabs doctor` | Full setup diagnostics with fix suggestions |
| `opentabs logs --plugin <name>` | Server-side plugin-specific logs |

---

## Updating This Skill

After resolving an issue, if you discovered a new error pattern, diagnostic technique, or resolution step that is not covered above, update this file directly. Add new error types to the Error Reference section, new diagnostic steps to the workflow, or new entries to the Quick Reference table.

**Rules:**
- Check for duplicates before adding — scan existing error reference
- Keep patterns generic, not specific to a single user's environment
- Verify the content is accurate based on what you observed
