import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';

const userSchema = z.object({
  id: z.string().describe('User ID'),
  name: z.string().describe('User display name'),
  email: z.string().describe('User email address'),
  role: z.string().describe('User role (admin, editor, viewer)'),
  createdAt: z.string().describe('ISO 8601 timestamp when the user was created'),
});

interface RawUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
}

const mapUser = (u: RawUser) => ({
  id: u.id ?? '',
  name: u.name ?? '',
  email: u.email ?? '',
  role: u.role ?? '',
  createdAt: u.createdAt ?? '',
});

export const listUsers = defineTool({
  name: 'list_users',
  displayName: 'List Users',
  description: 'List all users in the SQLPad instance with their roles and email addresses.',
  summary: 'List all users',
  icon: 'users',
  group: 'Account',
  input: z.object({}),
  output: z.object({
    users: z.array(userSchema).describe('Users in the instance'),
  }),
  handle: async () => {
    const data = await api<RawUser[]>('/users');
    return { users: data.map(mapUser) };
  },
});
