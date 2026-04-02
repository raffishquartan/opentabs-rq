import { ArrowUpCircle, Cog, FolderOpen, MoreHorizontal, Package, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { PluginState } from '../bridge';
import { openFolder } from '../bridge';
import { Button } from './retro/Button';
import { Dialog } from './retro/Dialog';
import { Loader } from './retro/Loader';
import { Menu } from './retro/Menu';

interface PluginMenuProps {
  plugin: PluginState;
  onUpdate: () => void;
  onRemove: () => void;
  updating: boolean;
  removing: boolean;
  /** Use muted icon color (for inactive/disconnected plugins). */
  muted?: boolean;
  className?: string;
  /** Callback to open the plugin settings dialog */
  onConfigOpen?: () => void;
}

const VersionItem = ({ plugin }: { plugin: PluginState }) => {
  if (plugin.source === 'npm') {
    return (
      <Menu.Item
        onSelect={() => window.open(`https://www.npmjs.com/package/${plugin.npmPackageName ?? plugin.name}`, '_blank')}>
        <Package className="h-3.5 w-3.5" />v{plugin.version}
      </Menu.Item>
    );
  }
  const { sourcePath } = plugin;
  if (sourcePath) {
    return (
      <Menu.Item onSelect={() => void openFolder(sourcePath)}>
        <FolderOpen className="h-3.5 w-3.5" />v{plugin.version}
      </Menu.Item>
    );
  }
  return (
    <Menu.Item disabled className="text-muted-foreground">
      <FolderOpen className="h-3.5 w-3.5" />v{plugin.version}
    </Menu.Item>
  );
};

const PluginMenu = ({
  plugin,
  onUpdate,
  onRemove,
  updating,
  removing,
  muted,
  className,
  onConfigOpen,
}: PluginMenuProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isLocal = plugin.source === 'local';
  const removeLabel = isLocal ? 'Remove' : 'Uninstall';

  const handleConfirmRemove = () => {
    setConfirmOpen(false);
    onRemove();
  };

  return (
    <div
      className={className}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
      }}
      role="presentation">
      <Menu>
        <Menu.Trigger asChild>
          <button
            type="button"
            className="relative flex h-6 w-6 items-center justify-center rounded hover:bg-muted/50"
            aria-label="Plugin options">
            <MoreHorizontal className={`h-4 w-4 ${muted ? 'text-muted-foreground' : ''}`} />
            {plugin.update && (
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-border bg-primary" />
            )}
          </button>
        </Menu.Trigger>
        <Menu.Content align="end">
          <VersionItem plugin={plugin} />
          {plugin.update && (
            <Menu.Item onClick={onUpdate}>
              {updating ? <Loader size="sm" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}
              Update to v{plugin.update.latestVersion}
            </Menu.Item>
          )}
          {onConfigOpen && plugin.configSchema && Object.keys(plugin.configSchema).length > 0 && (
            <Menu.Item onSelect={onConfigOpen}>
              <Cog className="h-3.5 w-3.5" />
              Settings
            </Menu.Item>
          )}
          <Menu.Item onSelect={() => setConfirmOpen(true)} variant="destructive" className="border-border border-t">
            {removing ? <Loader size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
            {removeLabel}
          </Menu.Item>
        </Menu.Content>
      </Menu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Content>
          <Dialog.Header className="border-destructive bg-destructive text-destructive-foreground">
            {removeLabel} Plugin
          </Dialog.Header>
          <Dialog.Body>
            <p className="text-foreground text-sm">
              Are you sure you want to {removeLabel.toLowerCase()}{' '}
              <strong className="font-head">{plugin.displayName}</strong>?
            </p>
            {isLocal ? (
              <p className="mt-1 text-muted-foreground text-xs">This will remove the plugin path from your config.</p>
            ) : (
              <p className="mt-1 text-muted-foreground text-xs">
                This will run npm uninstall and remove the plugin globally.
              </p>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close asChild>
              <Button size="sm" variant="outline">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive text-destructive"
              onClick={handleConfirmRemove}>
              {removeLabel}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
};

PluginMenu.displayName = 'PluginMenu';

export type { PluginMenuProps };
export { PluginMenu };
