import { ToggleSwitch } from './ToggleSwitch.js';
import { ToolRow } from './ToolRow.js';
import { TrustBadge } from './TrustBadge.js';
import { setToolEnabled, setAllToolsEnabled } from '../bridge.js';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { PluginState } from '../bridge.js';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';

/** Extract a human-readable domain from a plugin's URL patterns */
const extractDomain = (urlPatterns: string[]): string | null => {
  for (const pattern of urlPatterns) {
    const m = pattern.match(/^(?:\*|https?|ftp):\/\/(\*\.)?(.+?)(?:\/|$)/);
    if (m && m[2] && m[2] !== '*') {
      return m[2];
    }
  }
  return null;
};

const TabStateHint = ({ plugin }: { plugin: PluginState }) => {
  if (plugin.tabState === 'ready') return null;

  const domain = extractDomain(plugin.urlPatterns);

  if (plugin.tabState === 'closed') {
    return (
      <div className="px-3 pb-2 pl-[38px] text-[11px] text-red-400/80">
        {domain ? `Open ${domain} in your browser` : 'Open a matching tab in your browser'}
      </div>
    );
  }

  // unavailable
  return <div className="px-3 pb-2 pl-[38px] text-[11px] text-amber-400/80">Log in to {plugin.displayName}</div>;
};

const PluginCard = ({
  plugin,
  activeTools,
  setPlugins,
}: {
  plugin: PluginState;
  activeTools: Set<string>;
  setPlugins: Dispatch<SetStateAction<PluginState[]>>;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(errorTimerRef.current), []);

  const showToggleError = (message: string) => {
    clearTimeout(errorTimerRef.current);
    setToggleError(message);
    errorTimerRef.current = setTimeout(() => setToggleError(null), 3000);
  };

  const stateColor = {
    ready: 'bg-emerald-400',
    unavailable: 'bg-amber-400',
    closed: 'bg-red-400',
  }[plugin.tabState];

  const allEnabled = plugin.tools.length > 0 && plugin.tools.every(t => t.enabled);
  const someEnabled = plugin.tools.some(t => t.enabled);

  const handleToggleAll = (e: MouseEvent) => {
    e.stopPropagation();
    const newEnabled = !allEnabled;
    setPlugins(prev =>
      prev.map(p => (p.name === plugin.name ? { ...p, tools: p.tools.map(t => ({ ...t, enabled: newEnabled })) } : p)),
    );
    void setAllToolsEnabled(plugin.name, newEnabled).catch(() => {
      setPlugins(prev =>
        prev.map(p =>
          p.name === plugin.name ? { ...p, tools: p.tools.map(t => ({ ...t, enabled: !newEnabled })) } : p,
        ),
      );
      showToggleError('Failed to toggle all tools');
    });
  };

  const handleToggleTool = (toolName: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setPlugins(prev =>
      prev.map(p =>
        p.name === plugin.name
          ? { ...p, tools: p.tools.map(t => (t.name === toolName ? { ...t, enabled: newEnabled } : t)) }
          : p,
      ),
    );
    void setToolEnabled(plugin.name, toolName, newEnabled).catch(() => {
      setPlugins(prev =>
        prev.map(p =>
          p.name === plugin.name
            ? { ...p, tools: p.tools.map(t => (t.name === toolName ? { ...t, enabled: !newEnabled } : t)) }
            : p,
        ),
      );
      showToggleError(`Failed to toggle ${toolName}`);
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50">
      <button
        aria-expanded={expanded}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-gray-800/30"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          )}
          <div className={`h-2 w-2 shrink-0 rounded-full ${stateColor}`} />
          <span className="truncate text-sm font-medium text-gray-200">{plugin.displayName}</span>
          <span className="shrink-0 text-xs text-gray-500">v{plugin.version}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TrustBadge tier={plugin.trustTier} />
          <ToggleSwitch
            enabled={allEnabled}
            indeterminate={someEnabled && !allEnabled}
            onClick={handleToggleAll}
            ariaLabel={`Toggle all tools for ${plugin.name}`}
          />
        </div>
      </button>

      {toggleError && (
        <div className="mx-3 mb-1 rounded bg-red-900/40 px-2 py-1 text-[11px] text-red-300">{toggleError}</div>
      )}

      <TabStateHint plugin={plugin} />

      {expanded && (
        <div className="border-t border-gray-800/50">
          {plugin.tools.map(tool => (
            <ToolRow
              key={tool.name}
              name={tool.name}
              description={tool.description}
              enabled={tool.enabled}
              active={activeTools.has(`${plugin.name}:${tool.name}`)}
              onToggle={() => handleToggleTool(tool.name, tool.enabled)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { PluginCard };
