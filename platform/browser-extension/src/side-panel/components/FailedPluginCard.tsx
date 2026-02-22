import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { FailedPluginState } from '../bridge.js';

const FailedPluginCard = ({ plugin }: { plugin: FailedPluginState }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-destructive/50 bg-destructive/10 rounded border-2 p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-destructive h-4 w-4 shrink-0" />
        <span className="text-destructive text-sm font-medium">Failed to load</span>
      </div>
      <div className="text-muted-foreground mt-1 truncate text-xs">{plugin.specifier}</div>
      <div className={`text-destructive/80 mt-1 text-xs leading-snug select-text ${expanded ? '' : 'line-clamp-2'}`}>
        {plugin.error}
      </div>
      {plugin.error.length > 100 && (
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground mt-1 text-xs underline">
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

export { FailedPluginCard };
