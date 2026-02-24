import { requireTabId, sendErrorResult, sendSuccessResult } from './helpers.js';
import { clearConsoleLogs, getConsoleLogs, getRequests, startCapture, stopCapture } from '../network-capture.js';

export const handleBrowserEnableNetworkCapture = async (
  params: Record<string, unknown>,
  id: string | number,
): Promise<void> => {
  try {
    const tabId = requireTabId(params, id);
    if (tabId === null) return;
    const maxRequests = typeof params.maxRequests === 'number' ? params.maxRequests : 100;
    const urlFilter = typeof params.urlFilter === 'string' ? params.urlFilter : undefined;
    const maxConsoleLogs = typeof params.maxConsoleLogs === 'number' ? params.maxConsoleLogs : 500;

    await startCapture(tabId, maxRequests, urlFilter, maxConsoleLogs);
    sendSuccessResult(id, { enabled: true, tabId });
  } catch (err) {
    sendErrorResult(id, err);
  }
};

export const handleBrowserGetNetworkRequests = (params: Record<string, unknown>, id: string | number): void => {
  try {
    const tabId = requireTabId(params, id);
    if (tabId === null) return;
    const clear = typeof params.clear === 'boolean' ? params.clear : false;
    const requests = getRequests(tabId, clear);
    sendSuccessResult(id, { requests });
  } catch (err) {
    sendErrorResult(id, err);
  }
};

export const handleBrowserDisableNetworkCapture = (params: Record<string, unknown>, id: string | number): void => {
  try {
    const tabId = requireTabId(params, id);
    if (tabId === null) return;
    stopCapture(tabId);
    sendSuccessResult(id, { disabled: true, tabId });
  } catch (err) {
    sendErrorResult(id, err);
  }
};

export const handleBrowserGetConsoleLogs = (params: Record<string, unknown>, id: string | number): void => {
  try {
    const tabId = requireTabId(params, id);
    if (tabId === null) return;
    const clear = typeof params.clear === 'boolean' ? params.clear : false;
    const level = typeof params.level === 'string' ? params.level : undefined;
    const logs = getConsoleLogs(tabId, clear, level);
    sendSuccessResult(id, { logs });
  } catch (err) {
    sendErrorResult(id, err);
  }
};

export const handleBrowserClearConsoleLogs = (params: Record<string, unknown>, id: string | number): void => {
  try {
    const tabId = requireTabId(params, id);
    if (tabId === null) return;
    clearConsoleLogs(tabId);
    sendSuccessResult(id, { cleared: true });
  } catch (err) {
    sendErrorResult(id, err);
  }
};
