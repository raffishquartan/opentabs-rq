/**
 * Browser tool permission evaluation engine.
 *
 * Classifies browser tools into three security tiers (observe, interact,
 * sensitive) and evaluates whether a tool call should be auto-allowed,
 * require human confirmation, or be denied outright.
 *
 * The evaluation order (first match wins):
 *   1. domainToolPolicy[domain][tool] — per-domain per-tool override
 *   2. sensitiveDomains match → 'ask'
 *   3. toolPolicy[tool] — global per-tool override
 *   4. Tool tier default (observe=allow, interact=ask, sensitive=ask)
 *   5. trustedDomains match → override 'ask' to 'allow' (does NOT override 'deny')
 */

import type { ToolPermission } from './config.js';
import type { ServerState } from './state.js';

/** Security tier for browser tools */
type ToolTier = 'observe' | 'interact' | 'sensitive';

/**
 * Browser tool → security tier mapping.
 *
 * - observe: read-only tools that list or inspect without accessing sensitive data
 * - interact: tools that modify page state (click, type, navigate, screenshot)
 * - sensitive: tools that access credentials, execute arbitrary code, or modify auth state
 */
const TOOL_TIERS: Record<string, ToolTier> = {
  // Observe tier — read-only, low risk
  browser_list_tabs: 'observe',
  browser_get_tab_info: 'observe',
  browser_query_elements: 'observe',
  browser_wait_for_element: 'observe',
  browser_get_tab_content: 'observe',
  browser_get_console_logs: 'observe',
  browser_list_resources: 'observe',
  browser_get_resource_content: 'observe',
  browser_disable_network_capture: 'observe',
  extension_get_state: 'observe',
  extension_get_logs: 'observe',
  extension_get_side_panel: 'observe',
  extension_check_adapter: 'observe',

  // Interact tier — modifies page state or captures content
  browser_clear_console_logs: 'interact',
  browser_click_element: 'interact',
  browser_type_text: 'interact',
  browser_select_option: 'interact',
  browser_hover_element: 'interact',
  browser_press_key: 'interact',
  browser_scroll: 'interact',
  browser_screenshot_tab: 'interact',
  browser_navigate_tab: 'interact',
  browser_open_tab: 'interact',
  browser_close_tab: 'interact',
  browser_focus_tab: 'interact',
  browser_handle_dialog: 'interact',
  browser_get_page_html: 'interact',
  browser_enable_network_capture: 'interact',
  browser_get_network_requests: 'interact',
  browser_get_websocket_frames: 'interact',
  browser_export_har: 'interact',
  extension_force_reconnect: 'interact',
  extension_reload: 'interact',
  plugin_analyze_site: 'interact',

  // Sensitive tier — access credentials, execute arbitrary code, modify auth
  browser_execute_script: 'sensitive',
  browser_get_cookies: 'sensitive',
  browser_set_cookie: 'sensitive',
  browser_delete_cookies: 'sensitive',
  browser_get_storage: 'sensitive',
};

/** Default permission for each tier */
const TIER_DEFAULTS: Record<ToolTier, ToolPermission> = {
  observe: 'allow',
  interact: 'ask',
  sensitive: 'ask',
};

/**
 * Match a hostname against a domain pattern.
 *
 * Supports:
 *   - Exact match: 'example.com' matches 'example.com'
 *   - Wildcard prefix: '*.example.com' matches 'sub.example.com' and 'a.b.example.com'
 *     but NOT 'example.com' itself
 */
const matchDomain = (hostname: string, pattern: string): boolean => {
  if (pattern === hostname) return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // '.example.com'
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return false;
};

/** Check if a hostname matches any pattern in a domain list */
const matchesDomainList = (hostname: string, patterns: string[]): boolean =>
  patterns.some(p => matchDomain(hostname, p));

/**
 * Get the security tier for a browser tool by looking up the TOOL_TIERS map.
 * Tools not in the map default to 'interact' (safe middle ground).
 *
 * @param toolName - Browser tool name (e.g., 'browser_execute_script')
 * @returns The tool's security tier: 'observe', 'interact', or 'sensitive'
 */
export const getToolTier = (toolName: string): ToolTier => TOOL_TIERS[toolName] ?? 'interact';

/**
 * Evaluate the permission for a browser tool call.
 *
 * @param toolName - Browser tool name (e.g., 'browser_execute_script')
 * @param domain - Target domain hostname (e.g., 'mail.google.com'), or null for tools with no target
 * @param state - Server state (for skipConfirmation flag and permissions config)
 * @returns 'allow', 'ask', or 'deny'
 */
export const evaluatePermission = (toolName: string, domain: string | null, state: ServerState): ToolPermission => {
  // Bypass: if skipConfirmation is active, all tools are auto-allowed
  if (state.skipConfirmation) return 'allow';

  const permissions = state.permissions;

  // 1. Per-domain per-tool override (most specific)
  if (domain) {
    for (const [pattern, toolPolicies] of Object.entries(permissions.domainToolPolicy)) {
      if (matchDomain(domain, pattern) && toolName in toolPolicies) {
        const policy = toolPolicies[toolName];
        if (policy) return policy;
      }
    }
  }

  // 2. Sensitive domain check: if the domain matches, force 'ask'
  if (domain && matchesDomainList(domain, permissions.sensitiveDomains)) {
    return 'ask';
  }

  // 3. Global per-tool override
  if (toolName in permissions.toolPolicy) {
    const policy = permissions.toolPolicy[toolName];
    if (policy) return policy;
  }

  // 4. Tool tier default
  const tier = getToolTier(toolName);
  const tierDefault = TIER_DEFAULTS[tier];

  // 5. Trusted domain override: if tier default is 'ask' and domain is trusted,
  //    upgrade to 'allow'. Does NOT override 'deny'.
  if (tierDefault === 'ask' && domain && matchesDomainList(domain, permissions.trustedDomains)) {
    return 'allow';
  }

  return tierDefault;
};

export { TOOL_TIERS, TIER_DEFAULTS, matchDomain, matchesDomainList };
export type { ToolTier };
