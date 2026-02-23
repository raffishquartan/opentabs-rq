import { defineTool, ToolError } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';

/**
 * Throws ToolError with custom error codes to verify custom codes propagate
 * through the full dispatch chain.
 *
 * The published SDK (v0.0.16) only supports custom codes on `notFound()`.
 * For other categories, use the ToolError constructor directly with the
 * appropriate opts (category, retryable, retryAfterMs).
 */
export const errorCustomCode = defineTool({
  name: 'error_custom_code',
  displayName: 'Error: Custom Code',
  description: 'Throws ToolError with custom error codes — tests custom code propagation',
  icon: 'alert-triangle',
  input: z.object({
    factory: z
      .enum(['auth', 'not_found', 'rate_limited', 'validation', 'timeout', 'internal'])
      .describe('Which error category to throw with a custom code'),
  }),
  output: z.object({ ok: z.boolean() }),
  handle: async params => {
    switch (params.factory) {
      case 'auth':
        throw new ToolError('Custom auth error', 'CUSTOM_AUTH', {
          category: 'auth',
          retryable: false,
        });
      case 'not_found':
        throw ToolError.notFound('Custom not found', 'CUSTOM_NOT_FOUND');
      case 'rate_limited':
        throw new ToolError('Custom rate limit', 'CUSTOM_RATE_LIMIT', {
          category: 'rate_limit',
          retryable: true,
          retryAfterMs: 3000,
        });
      case 'validation':
        throw new ToolError('Custom validation', 'CUSTOM_VALIDATION', {
          category: 'validation',
          retryable: false,
        });
      case 'timeout':
        throw new ToolError('Custom timeout', 'CUSTOM_TIMEOUT', {
          category: 'timeout',
          retryable: true,
        });
      case 'internal':
        throw new ToolError('Custom internal', 'CUSTOM_INTERNAL', {
          category: 'internal',
          retryable: false,
        });
    }
  },
});
