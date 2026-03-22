import { FolderOpen, MoreHorizontal, Package } from 'lucide-react';
import { openFolder } from '../bridge';
import { Menu } from './retro/Menu';

const SERVER_NPM_PACKAGE = '@opentabs-dev/mcp-server';

interface BrowserToolsMenuProps {
  serverVersion?: string;
  serverSourcePath?: string;
  className?: string;
}

const isNpmInstall = (sourcePath: string): boolean => sourcePath.includes('node_modules');

const ServerVersionItem = ({
  serverVersion,
  serverSourcePath,
}: Pick<BrowserToolsMenuProps, 'serverVersion' | 'serverSourcePath'>) => {
  const label = `Server ${serverVersion ? `v${serverVersion}` : 'unknown'}`;

  if (serverSourcePath && isNpmInstall(serverSourcePath)) {
    return (
      <Menu.Item onSelect={() => window.open(`https://www.npmjs.com/package/${SERVER_NPM_PACKAGE}`, '_blank')}>
        <Package className="h-3.5 w-3.5" />
        {label}
      </Menu.Item>
    );
  }
  if (serverSourcePath) {
    return (
      <Menu.Item onSelect={() => void openFolder(serverSourcePath)}>
        <FolderOpen className="h-3.5 w-3.5" />
        {label}
      </Menu.Item>
    );
  }
  return (
    <Menu.Item disabled className="text-muted-foreground">
      <Package className="h-3.5 w-3.5" />
      {label}
    </Menu.Item>
  );
};

const BrowserToolsMenu = ({ serverVersion, serverSourcePath, className }: BrowserToolsMenuProps) => (
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
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted/50"
          aria-label="Browser tools options">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </Menu.Trigger>
      <Menu.Content align="end">
        <ServerVersionItem serverVersion={serverVersion} serverSourcePath={serverSourcePath} />
      </Menu.Content>
    </Menu>
  </div>
);

BrowserToolsMenu.displayName = 'BrowserToolsMenu';

export type { BrowserToolsMenuProps };
export { BrowserToolsMenu };
