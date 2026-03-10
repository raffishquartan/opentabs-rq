import { defineTool, ToolError } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { gql } from '../medium-api.js';
import { postSummarySchema, type RawPost, mapPostSummary } from './schemas.js';

interface PostResponsesData {
  post: {
    id: string;
    postResponses: { count: number };
    threadedPostResponses: {
      posts: RawPost[];
      pagingInfo: { next: { limit: number; page: number } | null };
    };
  } | null;
}

export const getPostResponses = defineTool({
  name: 'get_post_responses',
  displayName: 'Get Post Responses',
  description: 'Get responses (comments) on a Medium post. Returns the response count and individual response posts.',
  summary: 'Get comments on a post',
  icon: 'message-circle',
  group: 'Posts',
  input: z.object({
    post_id: z.string().describe('Medium post ID'),
    limit: z.number().int().min(1).max(25).optional().describe('Maximum responses to return (default 10)'),
  }),
  output: z.object({
    total_count: z.number().describe('Total number of responses'),
    responses: z.array(postSummarySchema),
    has_next: z.boolean().describe('Whether more responses are available'),
  }),
  handle: async params => {
    const limit = params.limit ?? 10;
    const data = await gql<PostResponsesData>(
      'PostResponsesQuery',
      `query PostResponsesQuery($postId: ID!, $paging: PagingOptions) {
        post(id: $postId) {
          id
          postResponses { count }
          threadedPostResponses(paging: $paging) {
            posts {
              id title mediumUrl firstPublishedAt clapCount voterCount
              creator { id name username }
              extendedPreviewContent { subtitle }
            }
            pagingInfo { next { limit page } }
          }
        }
      }`,
      { postId: params.post_id, paging: { limit } },
    );
    if (!data.post) throw ToolError.notFound(`Post not found: ${params.post_id}`);
    return {
      total_count: data.post.postResponses?.count ?? 0,
      responses: (data.post.threadedPostResponses?.posts ?? []).map(mapPostSummary),
      has_next: data.post.threadedPostResponses?.pagingInfo?.next !== null,
    };
  },
});
