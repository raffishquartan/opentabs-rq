import { z } from 'zod';

// --- Channel schemas ---

export const channelSchema = z.object({
  id: z.string().describe('Channel ID (e.g., C1234567890)'),
  name: z.string().describe('Channel name'),
  is_channel: z.boolean().describe('Whether this is a public channel'),
  is_private: z.boolean().describe('Whether this is a private channel'),
  num_members: z.number().describe('Number of members'),
  topic: z.string().describe('Channel topic'),
  purpose: z.string().describe('Channel purpose'),
});

interface RawChannel {
  id?: string;
  name?: string;
  is_channel?: boolean;
  is_private?: boolean;
  num_members?: number;
  topic?: { value?: string };
  purpose?: { value?: string };
}

export const mapChannel = (c: RawChannel) => ({
  id: c.id ?? '',
  name: c.name ?? '',
  is_channel: c.is_channel ?? false,
  is_private: c.is_private ?? false,
  num_members: c.num_members ?? 0,
  topic: c.topic?.value ?? '',
  purpose: c.purpose?.value ?? '',
});

// --- Message schemas ---

export const messageSchema = z.object({
  type: z.string().describe('Message type'),
  user: z.string().describe('User ID who sent the message'),
  text: z.string().describe('Message text content'),
  ts: z.string().describe('Message timestamp (unique ID)'),
});

interface RawMessage {
  type?: string;
  user?: string;
  text?: string;
  ts?: string;
}

export const mapMessage = (m: RawMessage) => ({
  type: m.type ?? 'message',
  user: m.user ?? '',
  text: m.text ?? '',
  ts: m.ts ?? '',
});

// --- Pagination schema ---

export const paginationMetadataSchema = z.object({
  next_cursor: z.string().optional().describe('Cursor for fetching the next page of results'),
});

// --- User schemas ---

export const userSchema = z.object({
  id: z.string().describe('User ID'),
  name: z.string().describe('Username'),
  real_name: z.string().describe('Display name'),
  is_admin: z.boolean().describe('Whether user is a workspace admin'),
  is_bot: z.boolean().describe('Whether user is a bot'),
});

interface RawUser {
  id?: string;
  name?: string;
  real_name?: string;
  profile?: { real_name?: string; display_name?: string };
  is_admin?: boolean;
  is_bot?: boolean;
}

export const mapUser = (u: RawUser) => ({
  id: u.id ?? '',
  name: u.name ?? '',
  real_name: u.real_name ?? u.profile?.real_name ?? u.profile?.display_name ?? '',
  is_admin: u.is_admin ?? false,
  is_bot: u.is_bot ?? false,
});

// --- User profile schema ---

export const userProfileSchema = z.object({
  id: z.string().describe('User ID'),
  name: z.string().describe('Username'),
  real_name: z.string().describe('Display name'),
  title: z.string().describe('Job title'),
  email: z.string().describe('Email address'),
  phone: z.string().describe('Phone number'),
  status_text: z.string().describe('Status message'),
  status_emoji: z.string().describe('Status emoji'),
  image_72: z.string().describe('Profile image URL (72px)'),
  timezone: z.string().describe('Timezone identifier'),
  is_admin: z.boolean().describe('Whether user is a workspace admin'),
  is_bot: z.boolean().describe('Whether user is a bot'),
});

interface RawUserProfile {
  id?: string;
  name?: string;
  real_name?: string;
  profile?: {
    real_name?: string;
    display_name?: string;
    title?: string;
    email?: string;
    phone?: string;
    status_text?: string;
    status_emoji?: string;
    image_72?: string;
  };
  tz?: string;
  is_admin?: boolean;
  is_bot?: boolean;
}

export const mapUserProfile = (u: RawUserProfile) => ({
  id: u.id ?? '',
  name: u.name ?? '',
  real_name: u.real_name ?? u.profile?.real_name ?? u.profile?.display_name ?? '',
  title: u.profile?.title ?? '',
  email: u.profile?.email ?? '',
  phone: u.profile?.phone ?? '',
  status_text: u.profile?.status_text ?? '',
  status_emoji: u.profile?.status_emoji ?? '',
  image_72: u.profile?.image_72 ?? '',
  timezone: u.tz ?? '',
  is_admin: u.is_admin ?? false,
  is_bot: u.is_bot ?? false,
});

// --- Reaction schema ---

export const reactionSchema = z.object({
  name: z.string().describe('Emoji name'),
  count: z.number().describe('Number of reactions'),
  users: z.array(z.string()).describe('User IDs who reacted'),
});

interface RawReaction {
  name?: string;
  count?: number;
  users?: string[];
}

export const mapReaction = (r: RawReaction) => ({
  name: r.name ?? '',
  count: r.count ?? 0,
  users: r.users ?? [],
});

// --- Pin schema ---

export const pinSchema = z.object({
  type: z.string().describe('Pin type (message or file)'),
  channel: z.string().describe('Channel ID'),
  message_ts: z.string().describe('Message timestamp (if message pin)'),
  message_text: z.string().describe('Message text (if message pin)'),
  created_by: z.string().describe('User who pinned the item'),
  created: z.number().describe('Unix timestamp when pinned'),
});

interface RawPin {
  type?: string;
  channel?: string;
  message?: { ts?: string; text?: string };
  created_by?: string;
  created?: number;
}

export const mapPin = (p: RawPin) => ({
  type: p.type ?? 'message',
  channel: p.channel ?? '',
  message_ts: p.message?.ts ?? '',
  message_text: p.message?.text ?? '',
  created_by: p.created_by ?? '',
  created: p.created ?? 0,
});

// --- Star/saved item schema ---

export const starredItemSchema = z.object({
  type: z.string().describe('Item type (message, file, etc.)'),
  channel: z.string().describe('Channel ID'),
  message_ts: z.string().describe('Message timestamp (if message)'),
  message_text: z.string().describe('Message text (if message)'),
  file_id: z.string().describe('File ID (if file)'),
  file_name: z.string().describe('File name (if file)'),
  date_create: z.number().describe('Unix timestamp when starred'),
});

interface RawStarredItem {
  type?: string;
  channel?: string;
  message?: { ts?: string; text?: string };
  file?: { id?: string; name?: string };
  date_create?: number;
}

export const mapStarredItem = (s: RawStarredItem) => ({
  type: s.type ?? '',
  channel: s.channel ?? '',
  message_ts: s.message?.ts ?? '',
  message_text: s.message?.text ?? '',
  file_id: s.file?.id ?? '',
  file_name: s.file?.name ?? '',
  date_create: s.date_create ?? 0,
});

// --- File schema ---

export const fileSchema = z.object({
  id: z.string().describe('File ID'),
  name: z.string().describe('File name'),
  title: z.string().describe('File title'),
  mimetype: z.string().describe('MIME type'),
  filetype: z.string().describe('Slack file type identifier'),
  size: z.number().describe('File size in bytes'),
  url_private: z.string().describe('Private download URL'),
  permalink: z.string().describe('Permalink to the file'),
  created: z.number().describe('Unix timestamp when created'),
  user: z.string().describe('User ID who uploaded the file'),
});

interface RawFile {
  id?: string;
  name?: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  size?: number;
  url_private?: string;
  permalink?: string;
  created?: number;
  user?: string;
}

export const mapFile = (f: RawFile) => ({
  id: f.id ?? '',
  name: f.name ?? '',
  title: f.title ?? '',
  mimetype: f.mimetype ?? '',
  filetype: f.filetype ?? '',
  size: f.size ?? 0,
  url_private: f.url_private ?? '',
  permalink: f.permalink ?? '',
  created: f.created ?? 0,
  user: f.user ?? '',
});
