import { describe, expect, it, vi } from 'vitest';
import type { MessageSerializationContext, WAChatModel, WAContactModel, WAMsgModel } from './whatsapp-api.js';
import {
  formatLondonTimestamp,
  getMessageSerializationContext,
  resolveSenderName,
  serializeChat,
  serializeMessage,
} from './whatsapp-api.js';

const OWN_ID = '447700900001@c.us';
const ALICE_ID = '447700900002@c.us';
const BOB_ID = '447700900003@c.us';
const GROUP_ID = '120363000000000000@g.us';

const wid = (serialized: string) => {
  const [user = '', server = ''] = serialized.split('@');
  return { _serialized: serialized, user, server };
};

const contact = (id: string, names: Partial<Pick<WAContactModel, 'name' | 'pushname' | 'shortName'>>) =>
  ({ id: wid(id), ...names }) as WAContactModel;

const msg = (overrides: Partial<WAMsgModel> & { fromMe?: boolean }): WAMsgModel => {
  const { fromMe = false, ...fields } = overrides;
  return {
    id: { _serialized: `${fromMe}_${ALICE_ID}_ABC123`, fromMe },
    body: '',
    type: 'chat',
    t: 1782900000,
    ack: 3,
    star: false,
    from: wid(fromMe ? OWN_ID : ALICE_ID),
    to: wid(fromMe ? ALICE_ID : OWN_ID),
    author: null,
    isMedia: false,
    isForwarded: false,
    ...fields,
  };
};

const contextWith = (...contacts: WAContactModel[]): MessageSerializationContext => ({
  ownId: OWN_ID,
  findContact: id => contacts.find(c => c.id._serialized === id),
});

const isoToUnix = (iso: string) => Date.parse(iso) / 1000;

describe('serializeChat', () => {
  it('derives group status from the id server and flags marked-unread chats', () => {
    const chat = {
      id: wid(GROUP_ID),
      name: 'Test Group',
      formattedTitle: 'Test Group',
      t: 1782900000,
      unreadCount: -1,
      archive: false,
      pin: 0,
      isReadOnly: false,
      muteExpiration: 0,
    } as unknown as WAChatModel;

    expect(serializeChat(chat)).toEqual({
      id: GROUP_ID,
      name: 'Test Group',
      is_group: true,
      unread_count: 0,
      marked_unread: true,
      timestamp: 1782900000,
      archived: false,
      pinned: false,
      muted: false,
      is_read_only: false,
    });
  });
});

describe('formatLondonTimestamp', () => {
  it.each([
    ['summer time', '2026-07-01T11:00:00Z', '2026-07-01T12:00:00+01:00'],
    ['winter time', '2026-12-01T11:00:00Z', '2026-12-01T11:00:00+00:00'],
    ['last second before the spring change', '2026-03-29T00:59:59Z', '2026-03-29T00:59:59+00:00'],
    ['first second after the spring change', '2026-03-29T01:00:00Z', '2026-03-29T02:00:00+01:00'],
    ['last second before the autumn change', '2026-10-25T00:59:59Z', '2026-10-25T01:59:59+01:00'],
    ['first second after the autumn change', '2026-10-25T01:00:00Z', '2026-10-25T01:00:00+00:00'],
    ['midnight local time', '2026-07-01T23:00:00Z', '2026-07-02T00:00:00+01:00'],
  ])('formats %s', (_label, utc, expected) => {
    expect(formatLondonTimestamp(isoToUnix(utc))).toBe(expected);
  });
});

describe('serializeMessage text and media type', () => {
  const context = contextWith();

  it('returns the body of a plain text message with a null media type', () => {
    const result = serializeMessage(msg({ type: 'chat', body: 'See you at 10:30' }), context);
    expect(result.text).toBe('See you at 10:30');
    expect(result.media_type).toBeNull();
  });

  it.each(['image', 'video', 'document'])('returns the caption of a captioned %s message', type => {
    const result = serializeMessage(
      msg({ type, body: '/9j/4AAQSkZJRgABAQAAAQABAAD', caption: 'Receipt - 12.40', isMedia: true }),
      context,
    );
    expect(result.text).toBe('Receipt - 12.40');
    expect(result.media_type).toBe(type);
  });

  it('returns empty text for an uncaptioned image and never the thumbnail body', () => {
    const result = serializeMessage(
      msg({ type: 'image', body: '/9j/4AAQSkZJRgABAQAAAQABAAD', isMedia: true }),
      context,
    );
    expect(result.text).toBe('');
    expect(result.media_type).toBe('image');
    expect(result).not.toHaveProperty('body');
  });

  it.each(['ptt', 'sticker', 'location'])('returns empty text and the raw media type for %s', type => {
    const result = serializeMessage(msg({ type, body: 'AAAAGGZ0eXBtcDQy', isMedia: true }), context);
    expect(result.text).toBe('');
    expect(result.media_type).toBe(type);
  });
});

describe('serializeMessage timestamps', () => {
  it('keeps the UTC unix timestamp and adds the London local time', () => {
    const t = isoToUnix('2026-07-01T11:00:00Z');
    const result = serializeMessage(msg({ t }), contextWith());
    expect(result.timestamp).toBe(t);
    expect(result.timestamp_local).toBe('2026-07-01T12:00:00+01:00');
  });
});

describe('serializeMessage sender', () => {
  it('attributes a group message to its author with the saved contact name', () => {
    const result = serializeMessage(
      msg({ from: wid(GROUP_ID), to: wid(OWN_ID), author: wid(ALICE_ID) }),
      contextWith(contact(ALICE_ID, { name: 'Alice Example', pushname: 'Ali', shortName: 'Alice' })),
    );
    expect(result.sender).toBe(ALICE_ID);
    expect(result.sender_name).toBe('Alice Example');
  });

  it('attributes an incoming 1:1 message from an unsaved contact to the other party with their own name', () => {
    const result = serializeMessage(
      msg({ from: wid(BOB_ID), to: wid(OWN_ID) }),
      contextWith(contact(BOB_ID, { pushname: 'Bob' })),
    );
    expect(result.sender).toBe(BOB_ID);
    expect(result.sender_name).toBe('Bob');
  });

  it('attributes an own message to the current user', () => {
    const result = serializeMessage(
      msg({ fromMe: true, from: wid(OWN_ID), to: wid(ALICE_ID) }),
      contextWith(contact(OWN_ID, { pushname: 'Me' })),
    );
    expect(result.from_me).toBe(true);
    expect(result.sender).toBe(OWN_ID);
    expect(result.sender_name).toBe('Me');
  });

  it('attributes an own group message to the current user, not the group', () => {
    const result = serializeMessage(msg({ fromMe: true, from: wid(GROUP_ID), to: wid(GROUP_ID) }), contextWith());
    expect(result.sender).toBe(OWN_ID);
  });

  it('falls back to the push name carried on the message when the sender is not a known contact', () => {
    const result = serializeMessage(
      msg({ from: wid(GROUP_ID), author: wid(BOB_ID), notifyName: 'Bob' }),
      contextWith(),
    );
    expect(result.sender).toBe(BOB_ID);
    expect(result.sender_name).toBe('Bob');
  });
});

describe('resolveSenderName', () => {
  it.each([
    ['the saved name first', { name: 'Alice Example', pushname: 'Ali', shortName: 'Alice' }, 'Ali2', 'Alice Example'],
    ['the contact push name when there is no saved name', { pushname: 'Ali', shortName: 'Alice' }, 'Ali2', 'Ali'],
    ['the message push name when the contact has none', { shortName: 'Alice' }, 'Ali2', 'Ali2'],
    ['the short name when no push name is known', { name: '', pushname: '', shortName: 'Alice' }, '', 'Alice'],
    ['empty when nothing is known', {}, undefined, ''],
  ])('uses %s', (_label, names, notifyName, expected) => {
    expect(resolveSenderName(contact(ALICE_ID, names), notifyName)).toBe(expected);
  });

  it('uses the message push name when the contact is unknown', () => {
    expect(resolveSenderName(undefined, 'Ali2')).toBe('Ali2');
  });
});

describe('getMessageSerializationContext', () => {
  it('throws an internal error when the current user id is unavailable', () => {
    vi.stubGlobal('require', (name: string) => {
      if (name !== 'WAWebUserPrefsMeUser') throw new Error(`Requiring unknown module "${name}"`);
      return {
        getMaybeMePnUser: () => undefined,
        getMaybeMeLidUser: () => undefined,
        getMaybeMeDisplayName: () => undefined,
      };
    });

    expect(() => getMessageSerializationContext()).toThrow('Current user id not available');

    vi.unstubAllGlobals();
  });
});
