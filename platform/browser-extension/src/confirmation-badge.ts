/** Pending confirmation count for badge tracking */
let pendingConfirmationCount = 0;

/** Update the extension badge to show pending confirmation count */
const updateConfirmationBadge = (): void => {
  if (pendingConfirmationCount > 0) {
    chrome.action.setBadgeText({ text: String(pendingConfirmationCount) }).catch(() => {});
    chrome.action.setBadgeBackgroundColor({ color: '#ffdb33' }).catch(() => {});
  } else {
    chrome.action.setBadgeText({ text: '' }).catch(() => {});
  }
};

/**
 * Show badge and Chrome notification when a confirmation request arrives.
 * The badge count persists until confirmations are resolved via clearConfirmationBadge().
 */
const notifyConfirmationRequest = (params: Record<string, unknown>): void => {
  pendingConfirmationCount++;
  updateConfirmationBadge();

  const tool = typeof params.tool === 'string' ? params.tool : 'unknown tool';
  const domain = typeof params.domain === 'string' ? params.domain : 'unknown domain';

  chrome.notifications
    .create(`opentabs-confirm-${typeof params.id === 'string' ? params.id : Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'OpenTabs: Approval Required',
      message: `${tool} on ${domain} — Click to open side panel`,
      priority: 2,
      requireInteraction: true,
    })
    .catch(() => {});
};

/** Decrement pending confirmation count and update badge */
const clearConfirmationBadge = (): void => {
  pendingConfirmationCount = Math.max(0, pendingConfirmationCount - 1);
  updateConfirmationBadge();
};

/** Reset all pending confirmation tracking (e.g., on disconnect) */
const clearAllConfirmationBadges = (): void => {
  pendingConfirmationCount = 0;
  updateConfirmationBadge();
};

/**
 * Register the chrome.notifications.onClicked listener that opens the side
 * panel when the user clicks a confirmation notification. Call this once
 * at startup (e.g., from background.ts) to avoid side effects at import time.
 */
const initConfirmationBadge = (): void => {
  chrome.notifications.onClicked.addListener(notificationId => {
    if (notificationId.startsWith('opentabs-confirm-')) {
      chrome.windows
        .getCurrent()
        .then(w => {
          if (w.id !== undefined) {
            chrome.sidePanel.open({ windowId: w.id }).catch(() => {});
          }
        })
        .catch(() => {});
      chrome.notifications.clear(notificationId).catch(() => {});
    }
  });
};

export { notifyConfirmationRequest, clearConfirmationBadge, clearAllConfirmationBadges, initConfirmationBadge };
