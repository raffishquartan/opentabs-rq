import type { Nodes, Root } from 'mdast';
import { toc } from 'mdast-util-toc';
import { remark } from 'remark';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

const textTypes = ['text', 'emphasis', 'strong', 'inlineCode'] as const;
type TextNodeType = (typeof textTypes)[number];

interface TextNode extends Node {
  type: TextNodeType;
  value?: string;
}

interface LinkNode extends Node {
  type: 'link';
  url: string;
  children: Node[];
}

interface ListNode extends Node {
  type: 'list';
  children: ListItemNode[];
}

interface ListItemNode extends Node {
  type: 'listItem';
  children: Node[];
}

const flattenNode = (node: Node): string => {
  const p: string[] = [];
  visit(node, (child: Node) => {
    if (!textTypes.includes((child as TextNode).type)) return;
    const textNode = child as TextNode;
    if ('value' in textNode && typeof textNode.value === 'string') {
      p.push(textNode.value);
    }
  });
  return p.join('');
};

interface Item {
  title: string;
  url: string;
  items?: Item[];
}

interface Items {
  items?: Item[];
}

const getItems = (node: Node | undefined | null, current: Partial<Item & Items>): Items => {
  if (!node) {
    return {};
  }

  if (node.type === 'paragraph') {
    visit(node, (item: Node) => {
      if (item.type === 'link') {
        const linkNode = item as LinkNode;
        current.url = linkNode.url;
        current.title = flattenNode(node);
      }

      if (item.type === 'text') {
        current.title = flattenNode(node);
      }
    });

    return current as Items;
  }

  if (node.type === 'list') {
    const listNode = node as ListNode;
    current.items = listNode.children.map(i => getItems(i, {}) as Item);
    return current as Items;
  } else if (node.type === 'listItem') {
    const listItemNode = node as ListItemNode;
    const heading = getItems(listItemNode.children[0] ?? null, {});

    if (listItemNode.children.length > 1) {
      getItems(listItemNode.children[1] ?? null, heading);
    }

    return heading;
  }

  return {};
};

const getToc = () => (node: Root, file: VFile) => {
  const table = toc(node as unknown as Nodes, { maxDepth: 3 });
  const items = getItems(table.map ?? null, {});

  file.data = { ...file.data, ...items };
};

export type TableOfContents = Items;

export const generateToc = async (content: string): Promise<TableOfContents> => {
  const result = await remark().use(getToc).process(content);

  return result.data as TableOfContents;
};
