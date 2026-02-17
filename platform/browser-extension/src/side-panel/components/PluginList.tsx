import { PluginCard } from './PluginCard.js';
import type { PluginState } from '../bridge.js';
import type { Dispatch, SetStateAction } from 'react';

const PluginList = ({
  plugins,
  activeTools,
  setPlugins,
}: {
  plugins: PluginState[];
  activeTools: Set<string>;
  setPlugins: Dispatch<SetStateAction<PluginState[]>>;
}) => (
  <div className="space-y-2">
    {plugins.map(plugin => (
      <PluginCard key={plugin.name} plugin={plugin} activeTools={activeTools} setPlugins={setPlugins} />
    ))}
  </div>
);

export { PluginList };
