import { describe, expect, it } from 'vitest';
import { serializeChat } from './whatsapp-api.js';

const wid = (serialized: string) => {
  const [user = '', server = ''] = serialized.split('@');
  return { _serialized: serialized, user, server };
};

describe('serializeChat', () => {
  it('derives group status from the id server and flags marked-unread chats', () => {
    const chat = {
      id: wid('120363000000000000@g.us'),
      name: 'Test Group',
      formattedTitle: 'Test Group',
      t: 1782900000,
      unreadCount: -1,
      archive: false,
      pin: 0,
      isReadOnly: false,
      muteExpiration: 0,
    } as unknown as Parameters<typeof serializeChat>[0];

    expect(serializeChat(chat)).toEqual({
      id: '120363000000000000@g.us',
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
