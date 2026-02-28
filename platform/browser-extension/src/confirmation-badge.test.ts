import { vi, describe, expect, test, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome API mocks — set up before importing the module under test so the
// module initialises against the stubs.
// ---------------------------------------------------------------------------

const mockSetBadgeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockSetBadgeBackgroundColor = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockNotificationsCreate = vi.fn<() => Promise<string>>().mockResolvedValue('');
const mockNotificationsClear = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
const mockGetURL = vi.fn((path: string) => `chrome-extension://fake-id/${path}`);

(globalThis as Record<string, unknown>).chrome = {
  action: {
    setBadgeText: mockSetBadgeText,
    setBadgeBackgroundColor: mockSetBadgeBackgroundColor,
  },
  notifications: {
    create: mockNotificationsCreate,
    clear: mockNotificationsClear,
    onClicked: { addListener: vi.fn() },
  },
  runtime: {
    getURL: mockGetURL,
  },
};

const {
  notifyConfirmationRequest,
  clearConfirmationBadge,
  clearConfirmationBackgroundTimeout,
  clearAllConfirmationBadges,
} = await import('./confirmation-badge.js');

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  // Reset internal module state via clearAllConfirmationBadges, then reset mocks
  clearAllConfirmationBadges();
  mockSetBadgeText.mockClear();
  mockSetBadgeBackgroundColor.mockClear();
  mockNotificationsCreate.mockClear();
  mockNotificationsClear.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// notifyConfirmationRequest
// ---------------------------------------------------------------------------

describe('notifyConfirmationRequest', () => {
  test('increments badge count and sets badge text', () => {
    notifyConfirmationRequest({ id: 'req-1', tool: 'doSomething', domain: 'example.com', timeoutMs: 0 });

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '1' });
  });

  test('increments badge count for each successive request', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 0 });

    expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: '2' });
  });

  test('sets badge background color when count is positive', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });

    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ffdb33' });
  });

  test('creates a Chrome notification with correct fields', () => {
    notifyConfirmationRequest({ id: 'my-id', tool: 'someAction', domain: 'work.example.com', timeoutMs: 0 });

    expect(mockNotificationsCreate).toHaveBeenCalledWith(
      'opentabs-confirm-my-id',
      expect.objectContaining({
        type: 'basic',
        title: 'OpenTabs: Approval Required',
        message: 'someAction on work.example.com — Click to open side panel',
        requireInteraction: true,
      }),
    );
  });

  test('uses fallback strings when tool/domain are not strings', () => {
    notifyConfirmationRequest({ id: 'req-x', timeoutMs: 0 });

    expect(mockNotificationsCreate).toHaveBeenCalledWith(
      'opentabs-confirm-req-x',
      expect.objectContaining({ message: 'unknown tool on unknown domain — Click to open side panel' }),
    );
  });

  test('sets background timeout when timeoutMs is positive', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 5000 });

    // Advance time to just before the timeout (5000 + 2000 buffer)
    vi.advanceTimersByTime(6999);
    mockSetBadgeText.mockClear();

    // Timeout has not fired yet
    expect(mockSetBadgeText).not.toHaveBeenCalled();

    // Advance past the timeout
    vi.advanceTimersByTime(1);
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('auto-clears badge when background timeout fires', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 3000 });
    mockSetBadgeText.mockClear();

    vi.advanceTimersByTime(3000 + 2000);

    // Badge should be cleared (count dropped back to 0)
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('uses fallback timeout when timeoutMs is zero so badge always self-clears', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    // Advance to just before the fallback fires (30_000 + 2_000 buffer)
    vi.advanceTimersByTime(31_999);
    expect(mockSetBadgeText).not.toHaveBeenCalled();

    // Advance past the fallback timeout — badge must clear
    vi.advanceTimersByTime(1);
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('duplicate id does not increment pendingConfirmationCount a second time', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 5000 });
    mockSetBadgeText.mockClear();

    // Second call with the same id — count must stay at 1, not become 2
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 5000 });

    // Badge text should not have been updated (count unchanged)
    expect(mockSetBadgeText).not.toHaveBeenCalled();
  });

  test('old timeout handle does not fire after being replaced by duplicate id', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 3000 });

    // Replace with a second call using the same id but a longer timeout
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 10000 });
    mockSetBadgeText.mockClear();

    // Advance past when the first timeout would have fired (3000 + 2000 buffer)
    vi.advanceTimersByTime(3000 + 2000 + 1);

    // The old timeout was cleared — badge must NOT have been cleared
    expect(mockSetBadgeText).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// clearConfirmationBadge
// ---------------------------------------------------------------------------

describe('clearConfirmationBadge', () => {
  test('decrements badge count by one', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    clearConfirmationBadge();

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '1' });
  });

  test('clears badge text when count reaches zero', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    clearConfirmationBadge();

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('does not underflow below zero (double-clear prevention)', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    clearConfirmationBadge(); // count → 0
    mockSetBadgeText.mockClear();

    clearConfirmationBadge(); // should stay at 0, not go negative

    // Badge should still show empty (not a negative number)
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('clears Chrome notification when id is provided', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    mockNotificationsClear.mockClear();

    clearConfirmationBadge('req-1');

    expect(mockNotificationsClear).toHaveBeenCalledWith('opentabs-confirm-req-1');
  });

  test('does not call chrome.notifications.clear when no id is provided', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    mockNotificationsClear.mockClear();

    clearConfirmationBadge();

    expect(mockNotificationsClear).not.toHaveBeenCalled();
  });

  test('calling twice with the same id decrements count only once', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 0 });

    clearConfirmationBadge('req-1');
    mockSetBadgeText.mockClear();

    // Second call with the same id — must be a no-op
    clearConfirmationBadge('req-1');

    expect(mockSetBadgeText).not.toHaveBeenCalled();
  });

  test('calling twice with the same id within the confirmation lifetime decrements count only once', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 5000 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 5000 });

    // Both clears happen before the background timeout fires (within lifetime)
    clearConfirmationBadge('req-1'); // first clear
    mockSetBadgeText.mockClear();

    clearConfirmationBadge('req-1'); // second clear — must be a no-op

    // Count stays at 1 (req-2 still pending)
    expect(mockSetBadgeText).not.toHaveBeenCalled();
  });

  test('when 3 confirmations pending and 1 cleared twice within lifetime, badge shows 2 not 1', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 0 });
    notifyConfirmationRequest({ id: 'req-3', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    clearConfirmationBadge('req-1'); // first clear (e.g. side panel)
    clearConfirmationBadge('req-1'); // second clear (within lifetime) — no-op

    // Badge must show 2, not 1
    expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: '2' });
  });

  test('re-used id after clearAllConfirmationBadges can be cleared again', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    clearAllConfirmationBadges();

    // New confirmation with the same id
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    clearConfirmationBadge('req-1');

    // Must decrement — cleared set was reset by clearAllConfirmationBadges
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('prunes id immediately when no background timeout is pending (production order: clearConfirmationBackgroundTimeout then clearConfirmationBadge)', () => {
    // This is the order used in handleSpConfirmationResponse and handleSpConfirmationTimeout
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 5000 });
    clearConfirmationBackgroundTimeout('req-1'); // cancels and removes from confirmationTimeouts
    clearConfirmationBadge('req-1'); // decrement — id should be pruned immediately

    // New confirmation with the same id — must be clearable without clearAll
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    clearConfirmationBadge('req-1');

    // Must decrement — pruned id should not block this
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('does not prune id when background timeout is still pending (idempotency preserved for in-flight race)', () => {
    // When the bg timeout is still pending, the id must stay in clearedConfirmationIds
    // so a concurrent bg timeout callback cannot double-decrement.
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 3000 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 10000 }); // longer timeout, won't fire

    clearConfirmationBadge('req-1'); // first clear while bg timeout is still pending

    // Bg timeout fires for req-1 — the id is in clearedConfirmationIds, so it's a no-op
    vi.advanceTimersByTime(3000 + 2000);

    // Count should still be 1 (req-2 still pending, req-1 decremented exactly once)
    expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: '1' });
  });

  test('re-used id after background timeout fires can be cleared again without clearAll', () => {
    // req-1 is handled by the background timeout — id pruned from cleared set
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 3000 });
    vi.advanceTimersByTime(3000 + 2000);

    // New confirmation with the same id (no clearAll required)
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    clearConfirmationBadge('req-1');

    // Must decrement — pruning ensures the id is not stuck in the cleared set
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });
});

// ---------------------------------------------------------------------------
// clearConfirmationBackgroundTimeout
// ---------------------------------------------------------------------------

describe('clearConfirmationBackgroundTimeout', () => {
  test('prevents the background timeout from auto-clearing the badge', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 5000 });
    mockSetBadgeText.mockClear();

    clearConfirmationBackgroundTimeout('req-1');

    // Advance past when the timeout would have fired
    vi.advanceTimersByTime(5000 + 2000 + 1000);

    // Badge should NOT have been cleared by the background timeout
    expect(mockSetBadgeText).not.toHaveBeenCalled();
  });

  test('is a no-op for unknown id', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 5000 });
    mockSetBadgeText.mockClear();

    // Clearing an id that was never registered should not throw or affect state
    expect(() => clearConfirmationBackgroundTimeout('nonexistent')).not.toThrow();

    // Original timeout should still fire
    vi.advanceTimersByTime(5000 + 2000);
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('prunes id from cleared set so re-used id in new confirmation can be decremented without clearAll', () => {
    // Side-panel path: clearConfirmationBadge then clearConfirmationBackgroundTimeout
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 5000 });
    clearConfirmationBadge('req-1'); // side panel clears → id added to cleared set
    clearConfirmationBackgroundTimeout('req-1'); // cancels timeout, prunes id

    // New confirmation with the same id (no clearAll required)
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    clearConfirmationBadge('req-1');

    // Must decrement — pruning ensures the id is not stuck in the cleared set
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });
});

// ---------------------------------------------------------------------------
// clearAllConfirmationBadges
// ---------------------------------------------------------------------------

describe('clearAllConfirmationBadges', () => {
  test('resets badge to empty', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 0 });
    mockSetBadgeText.mockClear();

    clearAllConfirmationBadges();

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('cancels all pending background timeouts', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 3000 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 4000 });
    mockSetBadgeText.mockClear();

    clearAllConfirmationBadges();
    mockSetBadgeText.mockClear();

    // Advance past when both timeouts would have fired
    vi.advanceTimersByTime(4000 + 2000 + 1000);

    // Neither timeout should have triggered another badge update
    expect(mockSetBadgeText).not.toHaveBeenCalled();
  });

  test('resets count so subsequent clears do not underflow', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    clearAllConfirmationBadges();
    mockSetBadgeText.mockClear();

    clearConfirmationBadge(); // count is 0, should stay at 0

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('is idempotent when called with nothing pending', () => {
    expect(() => clearAllConfirmationBadges()).not.toThrow();
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  test('clears Chrome notifications for all pending confirmations', () => {
    notifyConfirmationRequest({ id: 'req-1', timeoutMs: 0 });
    notifyConfirmationRequest({ id: 'req-2', timeoutMs: 0 });
    mockNotificationsClear.mockClear();

    clearAllConfirmationBadges();

    expect(mockNotificationsClear).toHaveBeenCalledWith('opentabs-confirm-req-1');
    expect(mockNotificationsClear).toHaveBeenCalledWith('opentabs-confirm-req-2');
    expect(mockNotificationsClear).toHaveBeenCalledTimes(2);
  });
});
