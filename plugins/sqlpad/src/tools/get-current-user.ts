import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';
import { type RawCurrentUser, currentUserSchema, mapCurrentUser } from './schemas.js';

interface AppResponse {
  currentUser?: RawCurrentUser;
  version?: string;
}

export const getCurrentUser = defineTool({
  name: 'get_current_user',
  displayName: 'Get Current User',
  description:
    'Get the currently authenticated user profile including ID, email, and role. Also returns the SQLPad version.',
  summary: 'Get current user profile',
  icon: 'user',
  group: 'Account',
  input: z.object({}),
  output: z.object({
    user: currentUserSchema,
    version: z.string().describe('SQLPad server version'),
  }),
  handle: async () => {
    const data = await api<AppResponse>('/app');
    return {
      user: mapCurrentUser(data.currentUser ?? {}),
      version: data.version ?? '',
    };
  },
});
