// Side panel toggle — manages per-window open state using Chrome's
// authoritative onOpened/onClosed events (Chrome 141+) and toggles
// the side panel via the action click handler.

const openWindows = new Set<number>();

/** Initialize side panel toggle behavior and register Chrome event listeners */
export const initSidePanelToggle = (): void => {
  // Take manual control of the side panel so we can open/close it on action click.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

  chrome.sidePanel.onOpened.addListener(({ windowId }) => {
    openWindows.add(windowId);
  });

  chrome.sidePanel.onClosed.addListener(({ windowId }) => {
    openWindows.delete(windowId);
  });

  chrome.action.onClicked.addListener(({ windowId }) => {
    if (openWindows.has(windowId)) {
      chrome.sidePanel.close({ windowId }).catch(() => {});
    } else {
      chrome.sidePanel.open({ windowId }).catch(() => {});
    }
  });
};
