import { defineTool, fetchText } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { resolveDocumentId } from '../google-docs-api.js';

const parseModelChunksFromHtml = (html: string): string | null => {
  const textChunks: Array<{ ibi: number; text: string }> = [];
  const marker = 'DOCS_modelChunk =';
  let searchFrom = 0;

  while (true) {
    const markerIdx = html.indexOf(marker, searchFrom);
    if (markerIdx === -1) break;

    const jsonStart = html.indexOf('{', markerIdx + marker.length);
    if (jsonStart === -1) break;
    const semiIdx = html.indexOf(';', jsonStart);
    if (semiIdx === -1) break;
    searchFrom = semiIdx + 1;

    try {
      const chunkJson = JSON.parse(html.slice(jsonStart, semiIdx)) as Record<string, unknown>;
      const chunkOps = chunkJson.chunk as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(chunkOps)) continue;

      for (const op of chunkOps) {
        if (op.ty === 'is' && typeof op.s === 'string') {
          textChunks.push({ ibi: (op.ibi as number) || 1, text: op.s as string });
        }
      }
    } catch {
      // Malformed chunk — skip and try the next one.
    }
  }

  if (textChunks.length === 0) return null;
  textChunks.sort((a, b) => a.ibi - b.ibi);

  const rawText = textChunks.map(c => c.text).join('');
  const lines = rawText.split('\n').filter(line => line.length > 0);
  return lines.join('\n');
};

const extractTitleFromHtml = (html: string): string => {
  const match = html.match(/<title>([^<]*)<\/title>/);
  if (!match?.[1]) return '';
  return match[1].replace(/ - Google Docs$/, '');
};

export const getDocumentText = defineTool({
  name: 'get_document_text',
  displayName: 'Get Document Text',
  description:
    'Get the plain-text content of a Google Doc. Fetches the latest saved document content from the server, including edits by other collaborators. Returns the full document text as paragraphs joined by newlines.',
  summary: 'Read the plain text of a document',
  icon: 'file-text',
  group: 'Documents',
  input: z.object({
    document_id: z
      .string()
      .optional()
      .describe('Google Docs document ID. Defaults to the document open in the current editor tab.'),
  }),
  output: z.object({
    document_id: z.string().describe('Google Docs document ID'),
    title: z.string().describe('Document title'),
    text: z.string().describe('Plain-text document content'),
  }),
  handle: async params => {
    const documentId = resolveDocumentId(params.document_id);
    const url = `${window.location.origin}/document/d/${documentId}/edit?tab=t.0&_cb=${Date.now()}`;

    const html = await fetchText(url, { cache: 'no-store' });
    const text = parseModelChunksFromHtml(html);

    if (text === null) {
      return {
        document_id: documentId,
        title: extractTitleFromHtml(html),
        text: '',
      };
    }

    return {
      document_id: documentId,
      title: extractTitleFromHtml(html),
      text,
    };
  },
});
