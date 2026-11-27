import { urlMatchesPatterns } from '@opentabs-dev/shared/url-patterns';
import type { PluginMeta } from './extension-messages.js';

/**
 * Finds all open tabs matching a plugin's URL patterns, sorted by rank (best first).
 *
 * Ranking prefers (in order):
 *   1. Active tab in the focused window
 *   2. Active tab in any window
 *   3. Any tab in the focused window
 *   4. First matching tab
 *
 * This enables fallback: when the best-ranked tab is not ready, callers can
 * try subsequent tabs in order.
 *
 * @param plugin - Plugin metadata containing `urlPatterns` to match against
 * @returns Matching tabs sorted by rank (highest-priority first), deduplicated by tab ID
 */
export const findAllMatchingTabs = async (plugin: PluginMeta): Promise<chrome.tabs.Tab[]> => {
  // Collect all matching tabs across all URL patterns, deduplicating by tab ID
  const seen = new Set<number>();
  const allMatches: chrome.tabs.Tab[] = [];

  for (const pattern of plugin.urlPatterns) {
    let tabs: chrome.tabs.Tab[];
    try {
      tabs = await chrome.tabs.query({ url: pattern });
    } catch {
      continue;
    }
    for (const tab of tabs) {
      if (tab.id !== undefined && !seen.has(tab.id)) {
        seen.add(tab.id);
        allMatches.push(tab);
      }
    }
  }

  // Post-filter: remove tabs whose URL matches any exclude pattern
  const excludePatterns = plugin.excludePatterns ?? [];
  const filtered =
    excludePatterns.length > 0
      ? allMatches.filter(tab => !tab.url || !urlMatchesPatterns(tab.url, excludePatterns))
      : allMatches;

  if (filtered.length <= 1) return filtered;

  // Determine the focused window for ranking
  let focusedWindowId: number | undefined;
  try {
    const focusedWindow = await chrome.windows.getLastFocused();
    focusedWindowId = focusedWindow.id;
  } catch {
    // Cannot determine focused window — ranking falls back to insertion order
  }

  // Rank: active+focused > active > focused > other
  const rank = (tab: chrome.tabs.Tab): number => {
    const inFocused = focusedWindowId !== undefined && tab.windowId === focusedWindowId;
    if (tab.active && inFocused) return 3;
    if (tab.active) return 2;
    if (inFocused) return 1;
    return 0;
  };

  return filtered.slice().sort((a, b) => rank(b) - rank(a));
};

/**
 * Finds the best matching tab for a plugin's URL patterns.
 *
 * @param plugin - Plugin metadata containing `urlPatterns` to match against
 * @returns The highest-ranked matching tab, or `null` if no matching tabs exist.
 *   See {@link findAllMatchingTabs} for ranking details.
 */
export const findMatchingTab = async (plugin: PluginMeta): Promise<chrome.tabs.Tab | null> => {
  const tabs = await findAllMatchingTabs(plugin);
  return tabs[0] ?? null;
};
