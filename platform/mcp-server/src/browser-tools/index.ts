/**
 * Browser tools barrel — collects all browser tool definitions into a single array.
 *
 * On module load, validates that the actual tool definitions match the static
 * BROWSER_TOOL_NAMES list in browser-tool-names.ts. This catches drift when
 * a tool is added or removed from one file but not the other.
 */

import { analyzeSiteTool } from './analyze-site.js';
import { clearConsoleLogs } from './clear-console-logs.js';
import { clickElement } from './click-element.js';
import { closeTab } from './close-tab.js';
import { deleteCookies } from './delete-cookies.js';
import { disableNetworkCapture } from './disable-network-capture.js';
import { enableNetworkCapture } from './enable-network-capture.js';
import { executeScript } from './execute-script.js';
import { exportHar } from './export-har.js';
import { extensionCheckAdapter } from './extension-check-adapter.js';
import { extensionForceReconnect } from './extension-force-reconnect.js';
import { extensionGetLogs } from './extension-get-logs.js';
import { extensionGetSidePanel } from './extension-get-side-panel.js';
import { extensionGetState } from './extension-get-state.js';
import { focusTab } from './focus-tab.js';
import { getConsoleLogs } from './get-console-logs.js';
import { getCookies } from './get-cookies.js';
import { getNetworkRequests } from './get-network-requests.js';
import { getPageHtml } from './get-page-html.js';
import { getResourceContent } from './get-resource-content.js';
import { getStorage } from './get-storage.js';
import { getTabContent } from './get-tab-content.js';
import { getTabInfo } from './get-tab-info.js';
import { getWebSocketFrames } from './get-websocket-frames.js';
import { handleDialog } from './handle-dialog.js';
import { hoverElement } from './hover-element.js';
import { listResources } from './list-resources.js';
import { listTabs } from './list-tabs.js';
import { navigateTab } from './navigate-tab.js';
import { openTab } from './open-tab.js';
import { pressKey } from './press-key.js';
import { queryElements } from './query-elements.js';
import { reloadExtension } from './reload-extension.js';
import { screenshotTab } from './screenshot-tab.js';
import { scroll } from './scroll.js';
import { selectOption } from './select-option.js';
import { setCookie } from './set-cookie.js';
import { typeText } from './type-text.js';
import { waitForElement } from './wait-for-element.js';
import { BROWSER_TOOL_NAMES } from '../browser-tool-names.js';
import type { BrowserToolDefinition } from './definition.js';

const browserTools: BrowserToolDefinition[] = [
  reloadExtension,
  listTabs,
  openTab,
  closeTab,
  navigateTab,
  focusTab,
  getTabInfo,
  executeScript,
  screenshotTab,
  getTabContent,
  getPageHtml,
  getStorage,
  clickElement,
  typeText,
  selectOption,
  waitForElement,
  queryElements,
  getCookies,
  setCookie,
  deleteCookies,
  enableNetworkCapture,
  getNetworkRequests,
  getWebSocketFrames,
  exportHar,
  disableNetworkCapture,
  getConsoleLogs,
  clearConsoleLogs,
  listResources,
  getResourceContent,
  pressKey,
  scroll,
  hoverElement,
  handleDialog,
  extensionGetState,
  extensionGetLogs,
  extensionGetSidePanel,
  extensionCheckAdapter,
  extensionForceReconnect,
  analyzeSiteTool,
];

// Validate that BROWSER_TOOL_NAMES in browser-tool-names.ts stays in sync
// with the actual tool definitions. Catches drift at module load time.
const actualNames = new Set(browserTools.map(t => t.name));
const staticNames = new Set(BROWSER_TOOL_NAMES);
for (const name of actualNames) {
  if (!staticNames.has(name)) {
    throw new Error(`Browser tool "${name}" is defined but missing from BROWSER_TOOL_NAMES in browser-tool-names.ts`);
  }
}
for (const name of staticNames) {
  if (!actualNames.has(name)) {
    throw new Error(`BROWSER_TOOL_NAMES contains "${name}" but no matching browser tool definition exists`);
  }
}

export { browserTools };
