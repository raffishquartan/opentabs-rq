import { log } from '@opentabs-dev/plugin-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WAChatModel, WAMsgModel } from './whatsapp-api.js';
import { loadMessages, MAX_HISTORY_LOADS } from './whatsapp-api.js';

vi.mock('@opentabs-dev/plugin-sdk', async importOriginal => ({
  ...(await importOriginal<typeof import('@opentabs-dev/plugin-sdk')>()),
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const CHAT_ID = '447700900002@c.us';

let nextId = 0;
const msgAt = (t: number, id = `MSG${String(nextId++).padStart(4, '0')}`) =>
  ({ id: { _serialized: `false_${CHAT_ID}_${id}`, fromMe: false }, t }) as WAMsgModel;

/** A chat whose message collection is a plain array the fake loader can prepend to. */
const fakeChat = (held: WAMsgModel[]) => {
  const msgs = [...held];
  const chat = { id: { _serialized: CHAT_ID }, msgs: { getModelsArray: () => [...msgs] } } as unknown as WAChatModel;
  const prepend = (count: number) => {
    const oldest = msgs.reduce((min, m) => Math.min(min, m.t), 1_800_000_000);
    for (let i = 1; i <= count; i++) msgs.unshift(msgAt(oldest - i));
  };
  return { chat, prepend };
};

/** Installs WhatsApp's `require` with the given modules; unknown names throw like the real one. */
const stubWhatsAppModules = (modules: Record<string, unknown>) => {
  vi.stubGlobal('require', (name: string) => {
    if (!(name in modules)) throw new Error(`Requiring unknown module "${name}"`);
    return modules[name];
  });
};

/** A loader that adds `pageSize` earlier messages per call. */
const pagingLoader = (prepend: (count: number) => void, pageSize: number) =>
  vi.fn(async (_options: { chat: WAChatModel }) => {
    prepend(pageSize);
    return [];
  });

const heldMessages = (count: number) => Array.from({ length: count }, (_, i) => msgAt(1_700_000_000 + i));

beforeEach(() => {
  nextId = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('loadMessages history loop', () => {
  it('loads repeatedly until the limit is reached, reporting progress per load', async () => {
    const { chat, prepend } = fakeChat(heldMessages(20));
    const loadEarlierMsgs = pagingLoader(prepend, 30);
    stubWhatsAppModules({ WAWebChatLoadMessages: { loadEarlierMsgs } });
    const reportProgress = vi.fn();

    const result = await loadMessages(chat, 100, reportProgress);

    expect(loadEarlierMsgs).toHaveBeenCalledTimes(3);
    expect(loadEarlierMsgs).toHaveBeenCalledWith({ chat });
    expect(reportProgress.mock.calls.map(([options]) => options.progress)).toEqual([50, 80, 100]);
    expect(reportProgress).toHaveBeenLastCalledWith(expect.objectContaining({ total: 100 }));
    expect(result.messages).toHaveLength(100);
    expect(result.totalLoaded).toBe(110);
    expect(result.historyComplete).toBe(true);
    expect(result.historyError).toBeUndefined();
  });

  it('stops when a load adds no messages', async () => {
    const { chat } = fakeChat(heldMessages(5));
    const loadEarlierMsgs = vi.fn(async () => []);
    stubWhatsAppModules({ WAWebChatLoadMessages: { loadEarlierMsgs } });

    const result = await loadMessages(chat, 20);

    expect(loadEarlierMsgs).toHaveBeenCalledTimes(1);
    expect(result.messages).toHaveLength(5);
    expect(result.historyComplete).toBe(true);
    expect(result.historyError).toBeUndefined();
  });

  it('stops after the maximum number of loads', async () => {
    const { chat, prepend } = fakeChat([]);
    const loadEarlierMsgs = pagingLoader(prepend, 1);
    stubWhatsAppModules({ WAWebChatLoadMessages: { loadEarlierMsgs } });

    const result = await loadMessages(chat, 100);

    expect(MAX_HISTORY_LOADS).toBe(10);
    expect(loadEarlierMsgs).toHaveBeenCalledTimes(MAX_HISTORY_LOADS);
    expect(result.messages).toHaveLength(MAX_HISTORY_LOADS);
    expect(result.historyComplete).toBe(true);
  });

  it('does not load when enough messages are already held', async () => {
    const { chat } = fakeChat(heldMessages(25));
    const requireSpy = vi.fn();
    vi.stubGlobal('require', requireSpy);

    const result = await loadMessages(chat, 20);

    expect(requireSpy).not.toHaveBeenCalled();
    expect(result.messages).toHaveLength(20);
    expect(result.totalLoaded).toBe(25);
    expect(result.historyComplete).toBe(true);
    expect(result.historyError).toBeUndefined();
  });

  it('returns the most recent messages oldest first, breaking timestamp ties by id', async () => {
    const held = [msgAt(300, 'C'), msgAt(100, 'A'), msgAt(400, 'E'), msgAt(200, 'B2'), msgAt(200, 'B1')];
    const { chat } = fakeChat(held);

    const result = await loadMessages(chat, 4);

    expect(result.messages.map(m => m.id._serialized)).toEqual([
      `false_${CHAT_ID}_B1`,
      `false_${CHAT_ID}_B2`,
      `false_${CHAT_ID}_C`,
      `false_${CHAT_ID}_E`,
    ]);
  });
});

describe('loadMessages ordering with incomplete ids', () => {
  it('keeps collection order for messages with equal timestamps when one has no serialized id', async () => {
    const noSerializedId = { id: { fromMe: false }, t: 200 } as unknown as WAMsgModel;
    const held = [msgAt(300, 'C'), noSerializedId, msgAt(200, 'B1'), msgAt(100, 'A')];
    const { chat } = fakeChat(held);

    const result = await loadMessages(chat, 4);

    expect(result.messages.map(m => m.t)).toEqual([100, 200, 200, 300]);
  });
});

describe('loadMessages loader failure', () => {
  it('returns held messages with the cause when the loader module is missing', async () => {
    const { chat } = fakeChat(heldMessages(3));
    stubWhatsAppModules({});

    const result = await loadMessages(chat, 20);

    expect(result.messages).toHaveLength(3);
    expect(result.historyComplete).toBe(false);
    expect(result.historyError).toBe('WAWebChatLoadMessages module not available');
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('WAWebChatLoadMessages module not available'));
  });

  it('returns held messages with the cause when the loader export is missing', async () => {
    const { chat } = fakeChat(heldMessages(3));
    stubWhatsAppModules({ WAWebChatLoadMessages: { loadRecentMsgs: vi.fn() } });

    const result = await loadMessages(chat, 20);

    expect(result.messages).toHaveLength(3);
    expect(result.historyComplete).toBe(false);
    expect(result.historyError).toBe('WAWebChatLoadMessages.loadEarlierMsgs not available');
  });

  it('returns held messages with the cause when the loader throws', async () => {
    const { chat } = fakeChat(heldMessages(3));
    const loadEarlierMsgs = vi.fn(async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'waitForChatLoading')");
    });
    stubWhatsAppModules({ WAWebChatLoadMessages: { loadEarlierMsgs } });

    const result = await loadMessages(chat, 20);

    expect(result.messages).toHaveLength(3);
    expect(result.historyComplete).toBe(false);
    expect(result.historyError).toBe("Cannot read properties of undefined (reading 'waitForChatLoading')");
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('waitForChatLoading'));
  });

  it('returns an empty list with the cause when the loader throws and nothing is held', async () => {
    const { chat } = fakeChat([]);
    stubWhatsAppModules({
      WAWebChatLoadMessages: {
        loadEarlierMsgs: vi.fn(async () => {
          throw new Error('history unavailable');
        }),
      },
    });

    const result = await loadMessages(chat, 20);

    expect(result.messages).toEqual([]);
    expect(result.historyComplete).toBe(false);
    expect(result.historyError).toBe('history unavailable');
  });

  it('keeps messages added by earlier loads when a later load throws', async () => {
    const { chat, prepend } = fakeChat(heldMessages(5));
    const loadEarlierMsgs = vi
      .fn(async (_options: { chat: WAChatModel }) => [])
      .mockImplementationOnce(async () => {
        prepend(10);
        return [];
      })
      .mockRejectedValueOnce(new Error('connection lost'));
    stubWhatsAppModules({ WAWebChatLoadMessages: { loadEarlierMsgs } });

    const result = await loadMessages(chat, 50);

    expect(loadEarlierMsgs).toHaveBeenCalledTimes(2);
    expect(result.messages).toHaveLength(15);
    expect(result.historyComplete).toBe(false);
    expect(result.historyError).toBe('connection lost');
  });
});
