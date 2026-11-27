import type { ToolHandlerContext } from '@opentabs-dev/plugin-sdk';
import { log, ToolError, waitUntil } from '@opentabs-dev/plugin-sdk';

// ---------------------------------------------------------------------------
// WhatsApp Web internal module system access
// ---------------------------------------------------------------------------
// WhatsApp Web uses Facebook's __d/require module system. All data lives in
// in-memory collections (Chat, Contact, Msg) and actions are dispatched via
// internal module functions. There are no REST APIs — everything goes through
// the WebSocket connection, and the client JS manages state locally.
// ---------------------------------------------------------------------------

/** Safe wrapper around WhatsApp Web's internal require() */
const waRequire = <T>(moduleName: string): T | undefined => {
  try {
    return (globalThis as unknown as { require: (name: string) => T }).require(moduleName) as T;
  } catch {
    return undefined;
  }
};

// ---------------------------------------------------------------------------
// Type definitions for WhatsApp Web internal objects
// ---------------------------------------------------------------------------

interface WidLike {
  _serialized: string;
  server: string;
  user: string;
}

export interface WAChatModel {
  id: WidLike;
  name: string;
  formattedTitle: string;
  t: number;
  unreadCount: number;
  archive: boolean;
  pin: number;
  isReadOnly: boolean;
  isLocked: boolean;
  muteExpiration: number | { sentinel: string };
  ephemeralDuration: number;
  groupMetadata?: WAGroupMetadata;
  msgs: WAMsgCollection;
  set: (props: Record<string, unknown>) => void;
  serialize: () => Record<string, unknown>;
}

interface WAGroupMetadata {
  id: WidLike;
  subject: string;
  subjectOwner?: WidLike;
  desc?: string;
  participants?: WAGroupParticipant[];
  restrict: boolean;
  announce: boolean;
  creation: number;
}

interface WAGroupParticipant {
  id: WidLike;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface WAMsgModel {
  id: { _serialized: string; fromMe: boolean };
  /** Message text for `chat` messages; a base64 thumbnail for media messages. */
  body: string;
  /** Media caption, separate from `body`; present on captioned image, video and document messages. */
  caption?: string;
  /** Raw WhatsApp message type, e.g. 'chat', 'image', 'video', 'album', 'document', 'revoked', 'ptt', 'sticker', 'location'. */
  type: string;
  /** Unix seconds. */
  t: number;
  ack: number;
  star: boolean;
  from: WidLike | null;
  to: WidLike | null;
  /** Individual sender of a group message. */
  author?: WidLike | null;
  isMedia: boolean;
  mediaKey?: string;
  isForwarded: boolean;
  quotedStanzaID?: string;
  quotedMsg?: { body?: string };
  /** Sender's self-declared push name as carried on the message; may be empty. */
  notifyName?: string;
}

interface WAMsgCollection {
  getModelsArray: () => WAMsgModel[];
}

export interface WAContactModel {
  id: WidLike;
  name: string;
  shortName: string;
  pushname: string;
  type: string;
  verifiedName: string;
  isBusiness: boolean;
  isEnterprise: boolean;
  isMe: boolean;
  isUser: boolean;
  isGroup: boolean;
}

interface WACollection<T> {
  getModelsArray: () => T[];
}

interface WAConnModel {
  pushname: string;
  platform: string;
  phone: Record<string, unknown>;
  locales: string;
  is24h: boolean;
  serialize: () => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Module accessors
// ---------------------------------------------------------------------------

export const getChatCollection = (): WACollection<WAChatModel> | undefined => {
  const mod = waRequire<{ ChatCollection: WACollection<WAChatModel> }>('WAWebChatCollection');
  return mod?.ChatCollection;
};

export const getContactCollection = (): WACollection<WAContactModel> | undefined => {
  const mod = waRequire<{ ContactCollection: WACollection<WAContactModel> }>('WAWebContactCollection');
  return mod?.ContactCollection;
};

export const getConn = (): WAConnModel | undefined => {
  const mod = waRequire<{ Conn: WAConnModel }>('WAWebConnModel');
  return mod?.Conn;
};

export const getMeUser = (): {
  pn: string | undefined;
  lid: string | undefined;
  displayName: string | undefined;
} => {
  const mod = waRequire<{
    getMaybeMePnUser: () => WidLike | undefined;
    getMaybeMeLidUser: () => WidLike | undefined;
    getMaybeMeDisplayName: () => string | undefined;
  }>('WAWebUserPrefsMeUser');
  if (!mod) return { pn: undefined, lid: undefined, displayName: undefined };
  return {
    pn: mod.getMaybeMePnUser()?._serialized,
    lid: mod.getMaybeMeLidUser()?._serialized,
    displayName: mod.getMaybeMeDisplayName(),
  };
};

// ---------------------------------------------------------------------------
// Chat lookup
// ---------------------------------------------------------------------------

export const findChatById = (chatId: string): WAChatModel | undefined => {
  const col = getChatCollection();
  if (!col) return undefined;
  return col.getModelsArray().find(c => c.id._serialized === chatId);
};

export const findChatByIdOrThrow = (chatId: string): WAChatModel => {
  const chat = findChatById(chatId);
  if (!chat) throw ToolError.notFound(`Chat not found: ${chatId}`);
  return chat;
};

/** WhatsApp Web determines group status from the ID server, not a model property. */
export const isChatGroup = (chat: WAChatModel): boolean => chat.id?.server === 'g.us';

// ---------------------------------------------------------------------------
// Contact lookup
// ---------------------------------------------------------------------------

export const findContactById = (contactId: string): WAContactModel | undefined => {
  const col = getContactCollection();
  if (!col) return undefined;
  return col.getModelsArray().find(c => c.id._serialized === contactId);
};

// ---------------------------------------------------------------------------
// Serializers — extract getter values from live model objects into plain data
// ---------------------------------------------------------------------------
// WhatsApp Web model objects use prototype getters for many properties
// (formattedTitle, isGroup, pin, etc.). Casting them to a plain interface
// loses those values. These serializers read each getter explicitly.

export interface SerializedChat {
  id: string;
  name: string;
  is_group: boolean;
  unread_count: number;
  marked_unread: boolean;
  timestamp: number;
  archived: boolean;
  pinned: boolean;
  muted: boolean;
  is_read_only: boolean;
}

export const serializeChat = (c: WAChatModel): SerializedChat => {
  const rawUnread = c.unreadCount ?? 0;
  return {
    id: c.id?._serialized ?? '',
    name: c.formattedTitle ?? c.name ?? '',
    is_group: c.id?.server === 'g.us',
    unread_count: Math.max(0, rawUnread),
    marked_unread: rawUnread === -1,
    timestamp: c.t ?? 0,
    archived: c.archive ?? false,
    pinned: typeof c.pin === 'number' ? c.pin > 0 : false,
    muted: typeof c.muteExpiration === 'number' ? c.muteExpiration > 0 : false,
    is_read_only: c.isReadOnly ?? false,
  };
};

export interface SerializedMessage {
  id: string;
  from_me: boolean;
  type: string;
  text: string;
  media_type: string | null;
  timestamp: number;
  timestamp_local: string;
  ack: number;
  starred: boolean;
  from: string;
  to: string;
  author: string;
  sender: string;
  sender_name: string;
  is_forwarded: boolean;
  has_media: boolean;
  quoted_message_id: string;
}

const LONDON_TIME_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Formats a Unix timestamp as ISO 8601 local time in Europe/London with its numeric UTC offset. */
export const formatLondonTimestamp = (unixSeconds: number): string => {
  const parts = Object.fromEntries(
    LONDON_TIME_PARTS.formatToParts(new Date(unixSeconds * 1000)).map(part => [part.type, part.value]),
  );
  const { year, month, day, hour, minute, second } = parts;
  const localAsUtcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const offsetMinutes = Math.round((localAsUtcMs - unixSeconds * 1000) / 60000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const offsetRemainder = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHours}:${offsetRemainder}`;
};

/** Message types whose `caption` field holds user-written text. */
const CAPTIONED_TYPES = new Set(['image', 'video', 'document']);

/** User-visible text: the body of a text message, the caption of a captioned media message, otherwise empty. */
const messageText = (m: WAMsgModel): string => {
  if (m.type === 'chat') return m.body;
  if (CAPTIONED_TYPES.has(m.type)) return m.caption ?? '';
  return '';
};

type ContactNames = Pick<WAContactModel, 'name' | 'pushname' | 'shortName'>;

/** Saved contact name, else the contact's push name, else the push name on the message, else the short name. */
export const resolveSenderName = (contact: ContactNames | undefined, notifyName: string | undefined): string =>
  contact?.name || contact?.pushname || notifyName || contact?.shortName || '';

export interface MessageSerializationContext {
  /** Serialized id of the current user, the sender of every `fromMe` message. */
  ownId: string;
  findContact: (id: string) => ContactNames | undefined;
}

export const serializeMessage = (m: WAMsgModel, context: MessageSerializationContext): SerializedMessage => {
  const sender = m.id.fromMe ? context.ownId : (m.author?._serialized ?? m.from?._serialized ?? '');
  return {
    id: m.id?._serialized ?? '',
    from_me: m.id?.fromMe ?? false,
    type: m.type ?? '',
    text: messageText(m),
    media_type: m.type === 'chat' ? null : m.type,
    timestamp: m.t ?? 0,
    timestamp_local: formatLondonTimestamp(m.t),
    ack: m.ack ?? 0,
    starred: m.star ?? false,
    from: m.from?._serialized ?? '',
    to: m.to?._serialized ?? '',
    author: m.author?._serialized ?? '',
    sender,
    sender_name: resolveSenderName(context.findContact(sender), m.notifyName),
    is_forwarded: m.isForwarded ?? false,
    has_media: m.isMedia ?? !!m.mediaKey,
    quoted_message_id: m.quotedStanzaID ?? '',
  };
};

export interface SerializedContact {
  id: string;
  name: string;
  short_name: string;
  push_name: string;
  is_business: boolean;
  is_me: boolean;
  type: string;
}

export const serializeContact = (c: WAContactModel): SerializedContact => ({
  id: c.id?._serialized ?? '',
  name: c.name ?? '',
  short_name: c.shortName ?? '',
  push_name: c.pushname ?? '',
  is_business: c.isBusiness ?? false,
  is_me: c.isMe ?? false,
  type: c.type ?? '',
});

/** Builds the serialization context from the live current-user and contact modules. */
export const getMessageSerializationContext = (): MessageSerializationContext => {
  const ownId = getMeUser().pn;
  if (!ownId) throw ToolError.internal('Current user id not available');
  const contacts = new Map((getContactCollection()?.getModelsArray() ?? []).map(c => [c.id._serialized, c]));
  return { ownId, findContact: id => contacts.get(id) };
};

// ---------------------------------------------------------------------------
// Message loading
// ---------------------------------------------------------------------------

/** Upper bound on history loads per call, bounding runtime when each load adds only a few messages. */
export const MAX_HISTORY_LOADS = 10;

type LoadEarlierMsgs = (options: { chat: WAChatModel }) => Promise<unknown>;

const resolveLoadEarlierMsgs = (): LoadEarlierMsgs => {
  const mod = waRequire<{ loadEarlierMsgs?: LoadEarlierMsgs }>('WAWebChatLoadMessages');
  if (!mod) throw new Error('WAWebChatLoadMessages module not available');
  if (typeof mod.loadEarlierMsgs !== 'function') throw new Error('WAWebChatLoadMessages.loadEarlierMsgs not available');
  return mod.loadEarlierMsgs;
};

/** Some messages WhatsApp Web holds (e.g. members of an album) carry no serialized id, so ties on `t` compare ids that may be empty. */
const messageIdKey = (m: WAMsgModel): string => m.id._serialized ?? '';

const compareMessages = (a: WAMsgModel, b: WAMsgModel): number =>
  a.t - b.t || messageIdKey(a).localeCompare(messageIdKey(b));

export interface LoadedMessages {
  /** The most recent `limit` held messages, oldest first. */
  messages: WAMsgModel[];
  /** Number of messages held in memory for the chat after loading. */
  totalLoaded: number;
  /** True when no history-loading error occurred, including when no load was needed. */
  historyComplete: boolean;
  /** Cause of the history-loading failure; present only when `historyComplete` is false. */
  historyError?: string;
}

/**
 * Loads earlier history until `limit` messages are held, a load adds none, or
 * MAX_HISTORY_LOADS loads have run. The history loader is an internal WhatsApp
 * Web module that changes without notice, so a loader failure ends loading and
 * is reported in the result alongside the messages already held.
 */
export const loadMessages = async (
  chat: WAChatModel,
  limit: number,
  reportProgress?: ToolHandlerContext['reportProgress'],
): Promise<LoadedMessages> => {
  let historyError: string | undefined;
  let held = chat.msgs.getModelsArray().length;
  for (let loads = 0; held < limit && loads < MAX_HISTORY_LOADS; loads++) {
    try {
      await resolveLoadEarlierMsgs()({ chat });
    } catch (error) {
      historyError = error instanceof Error ? error.message : String(error);
      log.warn(`Loading earlier WhatsApp messages failed: ${historyError}`);
      break;
    }
    const before = held;
    held = chat.msgs.getModelsArray().length;
    reportProgress?.({
      progress: Math.min(held, limit),
      total: limit,
      message: `Loaded earlier messages (${held} held)`,
    });
    if (held === before) break;
  }
  const all = [...chat.msgs.getModelsArray()].sort(compareMessages);
  return {
    messages: all.slice(-limit),
    totalLoaded: all.length,
    historyComplete: historyError === undefined,
    ...(historyError === undefined ? {} : { historyError }),
  };
};

// ---------------------------------------------------------------------------
// Chat navigation
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Open a chat in the WhatsApp Web UI using the internal command system. */
export const openChat = async (chat: WAChatModel): Promise<void> => {
  const cmdMod = waRequire<{ Cmd: { openChatBottom: (opts: { chat: WAChatModel }) => void } }>('WAWebCmd');
  if (!cmdMod) throw ToolError.internal('WAWebCmd module not available');
  cmdMod.Cmd.openChatBottom({ chat });
  // Wait for the UI to render the chat panel and compose box
  await delay(500);
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const sendTextMessage = async (chat: WAChatModel, text: string): Promise<void> => {
  // WhatsApp Web's addAndSendMsgToChat silently drops messages in the adapter
  // execution context. The reliable approach is to open the chat, paste text
  // into the Lexical compose box via ClipboardEvent, and press Enter.

  // 1. Open the chat via the internal command system
  await openChat(chat);

  // 2. Find the compose box (Lexical rich text editor)
  const composeBox = document.querySelector('[data-tab="10"][contenteditable="true"]') as HTMLElement | null;
  if (!composeBox) throw ToolError.internal('Compose box not found after opening chat');

  // 3. Focus and clear any existing content via Ctrl+A + Backspace
  composeBox.focus();
  await delay(50);
  composeBox.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyA',
      keyCode: 65,
      ctrlKey: true,
      bubbles: true,
    }),
  );
  await delay(50);
  composeBox.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Backspace',
      code: 'Backspace',
      keyCode: 8,
      bubbles: true,
    }),
  );
  await delay(100);

  // 4. Paste text via ClipboardEvent (Lexical handles paste reliably)
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  composeBox.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }),
  );
  await delay(200);

  // 5. Press Enter to send
  composeBox.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    }),
  );
};

export const setArchive = async (chat: WAChatModel, archive: boolean): Promise<void> => {
  const mod = waRequire<{
    setArchive: (chat: WAChatModel, archive: boolean) => Promise<unknown>;
  }>('WAWebSetArchiveChatAction');
  if (!mod) throw ToolError.internal('WAWebSetArchiveChatAction module not available');
  await mod.setArchive(chat, archive);
};

export const setPin = async (chat: WAChatModel, pin: boolean): Promise<void> => {
  const mod = waRequire<{
    setPin: (chatId: WidLike, pin: boolean) => Promise<unknown>;
  }>('WAWebChatPinBridge');
  if (!mod) throw ToolError.internal('WAWebChatPinBridge module not available');
  await mod.setPin(chat.id, pin);
};

export const sendConversationMute = async (chat: WAChatModel, muteExpiration: number): Promise<void> => {
  const mod = waRequire<{
    sendConversationMute: (chatId: WidLike, muteExpiration: number) => Promise<unknown>;
  }>('WAWebChatMuteBridge');
  if (!mod) throw ToolError.internal('WAWebChatMuteBridge module not available');
  await mod.sendConversationMute(chat.id, muteExpiration);
  chat.set({ muteExpiration });
};

export const markChatSeen = async (chat: WAChatModel, seen: boolean): Promise<void> => {
  const mod = waRequire<{
    markConversationSeen: (chatId: WidLike, unreadCount: number) => Promise<unknown>;
    markConversationUnseen: (chatId: WidLike) => Promise<unknown>;
  }>('WAWebChatSeenBridge');
  if (!mod) throw ToolError.internal('WAWebChatSeenBridge module not available');
  if (seen) {
    await mod.markConversationSeen(chat.id, 0);
    chat.set({ unreadCount: 0 });
  } else {
    await mod.markConversationUnseen(chat.id);
    chat.set({ unreadCount: -1 });
  }
};

export const deleteChat = async (chat: WAChatModel): Promise<void> => {
  const mod = waRequire<{
    sendConversationDelete: (chatId: WidLike) => Promise<unknown>;
  }>('WAWebChatDeleteBridge');
  if (!mod) throw ToolError.internal('WAWebChatDeleteBridge module not available');
  await mod.sendConversationDelete(chat.id);
};

export const clearChat = async (chat: WAChatModel): Promise<void> => {
  const mod = waRequire<{
    sendClear: (chat: WAChatModel, keepStarred: boolean) => Promise<unknown>;
  }>('WAWebChatClearBridge');
  if (!mod) throw ToolError.internal('WAWebChatClearBridge module not available');
  await mod.sendClear(chat, false);
};

export const starMessages = async (chat: WAChatModel, msgIds: string[], star: boolean): Promise<void> => {
  const mod = waRequire<{
    sendStarMsgs: (chat: WAChatModel, msgs: WAMsgModel[], star: boolean) => Promise<unknown>;
  }>('WAWebChatSendMessages');
  if (!mod) throw ToolError.internal('WAWebChatSendMessages module not available');
  const msgs = chat.msgs.getModelsArray().filter(m => msgIds.includes(m.id._serialized));
  if (msgs.length === 0) throw ToolError.notFound('No matching messages found');
  await mod.sendStarMsgs(chat, msgs, star);
};

export const deleteMessages = async (chat: WAChatModel, msgIds: string[]): Promise<void> => {
  const mod = waRequire<{
    sendDeleteMsgs: (chat: WAChatModel, msgs: WAMsgModel[], forEveryone: boolean) => Promise<unknown>;
  }>('WAWebChatSendMessages');
  if (!mod) throw ToolError.internal('WAWebChatSendMessages module not available');
  const msgs = chat.msgs.getModelsArray().filter(m => msgIds.includes(m.id._serialized));
  if (msgs.length === 0) throw ToolError.notFound('No matching messages found');
  await mod.sendDeleteMsgs(chat, msgs, false);
};

export const revokeMessages = async (chat: WAChatModel, msgIds: string[]): Promise<void> => {
  const mod = waRequire<{
    sendRevokeMsgs: (chat: WAChatModel, msgSet: { type: string; list: WAMsgModel[] }) => Promise<unknown>;
  }>('WAWebChatSendMessages');
  if (!mod) throw ToolError.internal('WAWebChatSendMessages module not available');
  const msgs = chat.msgs.getModelsArray().filter(m => msgIds.includes(m.id._serialized));
  if (msgs.length === 0) throw ToolError.notFound('No matching messages found');
  await mod.sendRevokeMsgs(chat, { type: 'message', list: msgs });
};

export const blockContact = async (contactId: string): Promise<void> => {
  const contact = findContactById(contactId);
  if (!contact) throw ToolError.notFound(`Contact not found: ${contactId}`);
  const mod = waRequire<{
    blockContact: (opts: { contact: WAContactModel; blockEntryPoint: string }) => Promise<unknown>;
  }>('WAWebBlockContactAction');
  if (!mod) throw ToolError.internal('WAWebBlockContactAction module not available');
  await mod.blockContact({ contact, blockEntryPoint: 'chat' });
};

export const unblockContact = async (contactId: string): Promise<void> => {
  const contact = findContactById(contactId);
  if (!contact) throw ToolError.notFound(`Contact not found: ${contactId}`);
  const mod = waRequire<{
    unblockContact: (contact: WAContactModel) => Promise<unknown>;
  }>('WAWebBlockContactAction');
  if (!mod) throw ToolError.internal('WAWebBlockContactAction module not available');
  await mod.unblockContact(contact);
};

export const createGroup = async (subject: string, participantIds: string[]): Promise<unknown> => {
  const widFactory = waRequire<{
    createWid: (id: string) => WidLike;
  }>('WAWebWidFactory');
  if (!widFactory) throw ToolError.internal('WAWebWidFactory module not available');

  const participants = participantIds.map(id => widFactory.createWid(id));

  const mod = waRequire<{
    createGroup: (subject: string, participants: WidLike[]) => Promise<unknown>;
  }>('WAWebCreateGroupAction');
  if (!mod) throw ToolError.internal('WAWebCreateGroupAction module not available');
  return mod.createGroup(subject, participants);
};

export const queryGroupInviteCode = async (chat: WAChatModel): Promise<string> => {
  const mod = waRequire<{
    queryGroupInviteCode: (chat: WAChatModel) => Promise<string>;
  }>('WAWebGroupInviteAction');
  if (!mod) throw ToolError.internal('WAWebGroupInviteAction module not available');
  return mod.queryGroupInviteCode(chat);
};

export const revokeGroupInvite = async (chat: WAChatModel): Promise<void> => {
  const mod = waRequire<{
    revokeGroupInvite: (chat: WAChatModel) => Promise<unknown>;
  }>('WAWebGroupInviteAction');
  if (!mod) throw ToolError.internal('WAWebGroupInviteAction module not available');
  await mod.revokeGroupInvite(chat);
};

// ---------------------------------------------------------------------------
// Auth detection
// ---------------------------------------------------------------------------

export const isAuthenticated = (): boolean => {
  const col = getChatCollection();
  if (!col) return false;
  return col.getModelsArray().length > 0;
};

export const waitForAuth = async (): Promise<boolean> => {
  try {
    await waitUntil(() => isAuthenticated(), {
      interval: 500,
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
};
