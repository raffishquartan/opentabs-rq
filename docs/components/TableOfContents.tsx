import type { ReactElement } from 'react';
import type { TableOfContents as TOCType } from '@/lib/toc';
import { cn } from '@/lib/utils';

interface TableOfContentsProps {
  toc: TOCType;
}

interface TOCItem {
  title: string;
  url: string;
  items?: TOCItem[];
}

const renderTOCItems = (items: TOCItem[], level = 0): ReactElement | null => {
  if (items.length === 0) return null;

  return (
    <ul className={cn('space-y-1', level > 0 && 'mt-1 ml-4')}>
      {items.map(item => (
        <li key={item.url}>
          <a
            href={item.url}
            title={item.title}
            className="block truncate border-transparent border-l-2 py-1 pl-2 text-sm transition-colors hover:border-accent hover:text-foreground">
            {item.title}
          </a>
          {item.items && renderTOCItems(item.items, level + 1)}
        </li>
      ))}
    </ul>
  );
};

export default function TableOfContents({ toc }: TableOfContentsProps) {
  if (!toc.items || toc.items.length === 0) {
    return null;
  }

  return (
    <div className="sidebar-scroll max-h-60 overflow-y-scroll overscroll-y-contain rounded-(--radius) border-2 border-border p-4">
      <h3 className="mb-3 border-border border-b-2 pb-2">On this Page</h3>
      {renderTOCItems(toc.items as TOCItem[])}
    </div>
  );
}
