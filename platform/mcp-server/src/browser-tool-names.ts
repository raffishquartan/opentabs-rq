/**
 * Static list of all browser tool names.
 *
 * Extracted into its own module so the plugin loader can check for browser
 * tool name references (prompt injection detection) without pulling in the
 * full browser-tools barrel and its heavy dependencies (Zod schemas,
 * handler implementations, etc.).
 *
 * browser-tools/index.ts validates at module load time that this list
 * matches the actual tool definitions.
 */

const BROWSER_TOOL_NAMES: readonly string[] = [
  'extension_reload',
  'browser_list_tabs',
  'browser_open_tab',
  'browser_close_tab',
  'browser_navigate_tab',
  'browser_focus_tab',
  'browser_get_tab_info',
  'browser_execute_script',
  'browser_screenshot_tab',
  'browser_get_tab_content',
  'browser_get_page_html',
  'browser_get_storage',
  'browser_click_element',
  'browser_type_text',
  'browser_select_option',
  'browser_wait_for_element',
  'browser_query_elements',
  'browser_get_cookies',
  'browser_set_cookie',
  'browser_delete_cookies',
  'browser_enable_network_capture',
  'browser_get_network_requests',
  'browser_get_websocket_frames',
  'browser_export_har',
  'browser_disable_network_capture',
  'browser_get_console_logs',
  'browser_clear_console_logs',
  'browser_list_resources',
  'browser_get_resource_content',
  'browser_press_key',
  'browser_scroll',
  'browser_hover_element',
  'browser_handle_dialog',
  'extension_get_state',
  'extension_get_logs',
  'extension_get_side_panel',
  'extension_check_adapter',
  'extension_force_reconnect',
  'plugin_analyze_site',
];

export { BROWSER_TOOL_NAMES };
