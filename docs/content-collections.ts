import { defineCollection, defineConfig } from '@content-collections/core';
import { compileMDX } from '@content-collections/mdx';
import { rehypePrettyCode } from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import remarkToc from 'remark-toc';
import type { Pluggable } from 'unified';
import { z } from 'zod';

const docs = defineCollection({
  name: 'docs',
  directory: 'content/docs',
  include: '**/*.mdx',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lastUpdated: z.string(),
    links: z
      .object({
        source: z.string().optional(),
        api_reference: z.string().optional(),
      })
      .optional(),
    // The raw MDX content — populated automatically by the frontmatter parser
    content: z.string(),
  }),
  transform: async (doc, ctx) => {
    const body = await compileMDX(ctx, doc, {
      remarkPlugins: [remarkToc],
      rehypePlugins: [rehypeSlug, [rehypePrettyCode, { theme: 'dracula-soft' }] as Pluggable],
    });
    // Derive url: content/docs/foo/bar.mdx → /docs/foo/bar
    // Strip trailing /index so the docs root resolves correctly
    const slug = doc._meta.path.replace(/\/index$/, '').replace(/^index$/, '');
    const url = `/docs${slug ? `/${slug}` : ''}`;
    return { ...doc, body, url };
  },
});

export default defineConfig({
  content: [docs],
});
