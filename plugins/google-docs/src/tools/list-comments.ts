import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { driveApi, resolveDocumentId } from '../google-docs-api.js';
import { COMMENT_LIST_FIELDS, commentSchema, mapComment, type RawComment } from './schemas.js';

export const listComments = defineTool({
  name: 'list_comments',
  displayName: 'List Comments',
  description:
    'List all comment threads on a Google Doc, including replies, resolution status, and the quoted document text each comment is anchored to. Returns comments ordered by creation time.',
  summary: 'List comments on a document',
  icon: 'message-square',
  group: 'Comments',
  input: z.object({
    document_id: z
      .string()
      .optional()
      .describe('Google Docs document ID. Defaults to the document open in the current editor tab.'),
    page_size: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of comments to return (default 50, max 100)'),
    page_token: z.string().optional().describe('Page token from a previous list_comments call'),
    include_deleted: z.boolean().optional().describe('Include deleted comments (default false)'),
  }),
  output: z.object({
    comments: z.array(commentSchema).describe('Comment threads on the document'),
    next_page_token: z.string().describe('Token for the next page, empty if there are no more results'),
  }),
  handle: async params => {
    const documentId = resolveDocumentId(params.document_id);

    const data = await driveApi<{ nextPageToken?: string; comments?: RawComment[] }>(
      `/files/${encodeURIComponent(documentId)}/comments`,
      {
        params: {
          fields: COMMENT_LIST_FIELDS,
          pageSize: params.page_size ?? 50,
          pageToken: params.page_token,
          includeDeleted: params.include_deleted ?? false,
        },
      },
    );

    return {
      comments: (data.comments ?? []).map(mapComment),
      next_page_token: data.nextPageToken ?? '',
    };
  },
});
