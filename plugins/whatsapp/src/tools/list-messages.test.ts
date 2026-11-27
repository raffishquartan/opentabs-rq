import { ToolError } from '@opentabs-dev/plugin-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listMessages } from './list-messages.js';

vi.mock('@opentabs-dev/plugin-sdk', async importOriginal => ({
  ...(await importOriginal<typeof import('@opentabs-dev/plugin-sdk')>()),
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const OWN_ID = '447700900001@c.us';
const ALICE_ID = '447700900002@c.us';

const wid = (serialized: string) => {
  const [user = '', server = ''] = serialized.split('@');
  return { _serialized: serialized, user, server };
};

const message = (n: number) => ({
  id: { _serialized: `false_${ALICE_ID}_MSG${n}`, fromMe: false },
  body: `Message ${n}`,
  type: 'chat',
  t: 1_782_900_000 + n,
  ack: 3,
  star: false,
  from: wid(ALICE_ID),
  to: wid(OWN_ID),
  isMedia: false,
  isForwarded: false,
});

const chatWithMessages = (count: number) => {
  const msgs = Array.from({ length: count }, (_, i) => message(i));
  return { id: wid(ALICE_ID), msgs: { getModelsArray: () => msgs } };
};

const stubWhatsApp = (chats: unknown[], extraModules: Record<string, unknown> = {}) => {
  const modules: Record<string, unknown> = {
    WAWebChatCollection: { ChatCollection: { getModelsArray: () => chats } },
    WAWebContactCollection: {
      ContactCollection: { getModelsArray: () => [{ id: wid(ALICE_ID), name: 'Alice Example' }] },
    },
    WAWebUserPrefsMeUser: {
      getMaybeMePnUser: () => wid(OWN_ID),
      getMaybeMeLidUser: () => undefined,
      getMaybeMeDisplayName: () => 'Me',
    },
    ...extraModules,
  };
  vi.stubGlobal('require', (name: string) => {
    if (!(name in modules)) throw new Error(`Requiring unknown module "${name}"`);
    return modules[name];
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('list_messages', () => {
  it('returns serialized messages with complete history and no error when no load was needed', async () => {
    stubWhatsApp([chatWithMessages(25)]);

    const result = await listMessages.handle({ chat_id: ALICE_ID });

    expect(result.messages).toHaveLength(20);
    expect(result.messages[0]).toMatchObject({ text: 'Message 5', sender: ALICE_ID, sender_name: 'Alice Example' });
    expect(result.total_loaded).toBe(25);
    expect(result.history_complete).toBe(true);
    expect(result).not.toHaveProperty('history_error');
    expect(listMessages.output.parse(result)).toEqual(result);
  });

  it('returns held messages with the cause when history loading fails', async () => {
    stubWhatsApp([chatWithMessages(3)]);

    const result = await listMessages.handle({ chat_id: ALICE_ID });

    expect(result.messages).toHaveLength(3);
    expect(result.history_complete).toBe(false);
    expect(result.history_error).toBe('WAWebChatLoadMessages module not available');
    expect(listMessages.output.parse(result)).toEqual(result);
  });

  it('passes progress reporting through to history loading', async () => {
    const chat = chatWithMessages(3);
    stubWhatsApp([chat], { WAWebChatLoadMessages: { loadEarlierMsgs: vi.fn(async () => []) } });
    const reportProgress = vi.fn();

    await listMessages.handle({ chat_id: ALICE_ID, limit: 10 }, { reportProgress });

    expect(reportProgress).toHaveBeenCalledTimes(1);
  });

  it('keeps the not-found error for an unknown chat', async () => {
    stubWhatsApp([chatWithMessages(3)]);

    const call = listMessages.handle({ chat_id: '447700900999@c.us' });

    await expect(call).rejects.toBeInstanceOf(ToolError);
    await expect(call).rejects.toThrow('Chat not found: 447700900999@c.us');
  });
});
