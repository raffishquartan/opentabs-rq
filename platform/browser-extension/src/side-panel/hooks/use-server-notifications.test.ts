import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ConfirmationData } from '../components/ConfirmationDialog.js';

// Tests for useServerNotifications.ts. The hook only uses useRef and useEffect,
// so it can be exercised as a plain function: refs become plain objects and
// effects are not run.
vi.mock('react', () => ({
  useRef: <T>(initial: T) => ({ current: initial }),
  useEffect: () => {},
}));

const { useServerNotifications } = await import('./useServerNotifications.js');

/** Run the hook against a plain array standing in for the pendingConfirmations state */
const setup = () => {
  let confirmations: ConfirmationData[] = [];
  const setPendingConfirmations = vi.fn((update: React.SetStateAction<ConfirmationData[]>) => {
    confirmations = typeof update === 'function' ? update(confirmations) : update;
  });
  const hook = useServerNotifications({
    setPlugins: vi.fn(),
    setActiveTools: vi.fn(),
    setPendingConfirmations,
  });
  return { hook, getConfirmations: () => confirmations };
};

const request = (id: string) => ({
  method: 'confirmation.request',
  params: { id, tool: 'send_message', plugin: 'slack', params: {} },
});

const cancel = (id: string) => ({ method: 'confirmation.cancel', params: { id } });

describe('useServerNotifications — confirmation.cancel', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  test('removes the cancelled prompt and keeps the others', () => {
    ctx.hook.handleNotification(request('conf-1'));
    ctx.hook.handleNotification(request('conf-2'));

    ctx.hook.handleNotification(cancel('conf-1'));

    expect(ctx.getConfirmations().map(c => c.id)).toEqual(['conf-2']);
  });

  test('a replayed request for a cancelled id does not bring the prompt back', () => {
    ctx.hook.handleNotification(request('conf-1'));
    ctx.hook.handleNotification(cancel('conf-1'));

    ctx.hook.handleNotification(request('conf-1'));

    expect(ctx.getConfirmations()).toEqual([]);
  });

  test('a cancel for an unknown id leaves the list unchanged', () => {
    ctx.hook.handleNotification(request('conf-1'));

    ctx.hook.handleNotification(cancel('other'));

    expect(ctx.getConfirmations().map(c => c.id)).toEqual(['conf-1']);
  });

  test('a cancel without a string id is ignored', () => {
    ctx.hook.handleNotification(request('conf-1'));

    ctx.hook.handleNotification({ method: 'confirmation.cancel', params: { id: 1 } });

    expect(ctx.getConfirmations().map(c => c.id)).toEqual(['conf-1']);
  });
});
