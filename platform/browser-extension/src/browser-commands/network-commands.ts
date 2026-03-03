import {
  clearConsoleLogs,
  getConsoleLogs,
  getRequests,
  getWsFrames,
  startCapture,
  stopCapture,
} from '../network-capture.js';
import { requireTabId, sendErrorResult, sendSuccessResult } from './helpers.js';

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
    const maxWsFrames = typeof params.maxWsFrames === 'number' ? params.maxWsFrames : 200;

    await startCapture(tabId, maxRequests, urlFilter, maxConsoleLogs, maxWsFrames);
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

export const handleBrowserGetWebSocketFrames = (params: Record<string, unknown>, id: string | number): void => {
  try {
    const tabId = requireTabId(params, id);
    if (tabId === null) return;
    const clear = typeof params.clear === 'boolean' ? params.clear : false;
    const frames = getWsFrames(tabId, clear);
    sendSuccessResult(id, { frames });
  } catch (err) {
    sendErrorResult(id, err);
  }
};
