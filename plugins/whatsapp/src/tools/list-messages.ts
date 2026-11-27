import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import {
  findChatByIdOrThrow,
  getMessageSerializationContext,
  loadMessages,
  serializeMessage,
} from '../whatsapp-api.js';
import { messageSchema } from './schemas.js';

export const listMessages = defineTool({
  name: 'list_messages',
  displayName: 'List Messages',
  description:
    'List the most recent messages in a WhatsApp chat, oldest first. Loads earlier history from the server when fewer than `limit` messages are held. ' +
    'Each message has `text` (the body of a text message, or the caption of an image, video or document; empty for other media such as voice notes, stickers and locations), ' +
    '`media_type` (null for text, otherwise the raw WhatsApp type, e.g. "image" or "ptt" for a voice note), ' +
    '`timestamp` (UTC Unix seconds) and `timestamp_local` (Europe/London ISO 8601 with offset), ' +
    'and `sender` / `sender_name` (the author in groups, the other party for incoming 1:1 messages, the user for own messages). ' +
    'If loading earlier history fails, the messages already held are returned with `history_complete` false and the cause in `history_error`.',
  summary: 'List messages in a chat',
  icon: 'messages-square',
  group: 'Messages',
  input: z.object({
    chat_id: z.string().min(1).describe('Chat ID to read messages from'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of messages to return (default 20, max 100)'),
  }),
  output: z.object({
    messages: z.array(messageSchema),
    total_loaded: z.number().int().describe('Total number of messages loaded in memory for this chat'),
    history_complete: z
      .boolean()
      .describe('False when loading earlier history failed; the messages already held are still returned'),
    history_error: z.string().optional().describe('Why loading earlier history failed; present only on failure'),
  }),
  handle: async (params, context) => {
    const chat = findChatByIdOrThrow(params.chat_id);
    const loaded = await loadMessages(chat, params.limit ?? 20, context?.reportProgress);
    const serializationContext = getMessageSerializationContext();
    return {
      messages: loaded.messages.map(m => serializeMessage(m, serializationContext)),
      total_loaded: loaded.totalLoaded,
      history_complete: loaded.historyComplete,
      ...(loaded.historyError === undefined ? {} : { history_error: loaded.historyError }),
    };
  },
});
