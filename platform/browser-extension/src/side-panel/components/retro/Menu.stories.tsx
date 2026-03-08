import type { ToolPermission } from '@opentabs-dev/shared';
import type { Meta, StoryObj } from '@storybook/react';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { PermissionSelect } from '../ToolRow';
import { Button } from './Button';
import { Menu } from './Menu';

const meta: Meta = {
  title: 'Retro/Menu',
  decorators: [Story => <div className="p-16">{Story()}</div>],
};

type Story = StoryObj;

const Default: Story = {
  render: () => (
    <Menu>
      <Menu.Trigger asChild>
        <Button size="sm">Open Menu</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Item One</Menu.Item>
        <Menu.Item>Item Two</Menu.Item>
        <Menu.Item>Item Three</Menu.Item>
      </Menu.Content>
    </Menu>
  ),
};

const TopAligned: Story = {
  render: () => (
    <div className="mt-40">
      <Menu>
        <Menu.Trigger asChild>
          <Button size="sm">Open Above</Button>
        </Menu.Trigger>
        <Menu.Content side="top" align="end">
          <Menu.Item>For this tool on this domain</Menu.Item>
          <Menu.Item>For this tool everywhere</Menu.Item>
          <Menu.Item>For all tools on example.com</Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  ),
};

const Disabled: Story = {
  render: () => (
    <Menu>
      <Menu.Trigger asChild>
        <Button size="sm" disabled>
          Disabled
        </Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Item One</Menu.Item>
      </Menu.Content>
    </Menu>
  ),
};

const WithSeparator: Story = {
  render: () => (
    <Menu>
      <Menu.Trigger asChild>
        <Button size="sm">Open Menu</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Edit</Menu.Item>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item variant="destructive">Delete</Menu.Item>
      </Menu.Content>
    </Menu>
  ),
};

const SideBySideWithSelect: Story = {
  render: () => {
    const [perm, setPerm] = useState<ToolPermission>('ask');
    return (
      <div className="flex items-start gap-8">
        <div>
          <p className="mb-2 text-muted-foreground text-xs">Menu dropdown</p>
          <Menu>
            <Menu.Trigger asChild>
              <Button size="sm">Open Menu</Button>
            </Menu.Trigger>
            <Menu.Content>
              <Menu.Item disabled className="text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                v0.1.0
              </Menu.Item>
              <Menu.Separator />
              <Menu.Item>Update to v0.2.0</Menu.Item>
              <Menu.Separator />
              <Menu.Item variant="destructive">Uninstall</Menu.Item>
            </Menu.Content>
          </Menu>
        </div>
        <div>
          <p className="mb-2 text-muted-foreground text-xs">Select dropdown</p>
          <PermissionSelect value={perm} onValueChange={setPerm} disabled={false} ariaLabel="Permission" />
        </div>
      </div>
    );
  },
};

export default meta;
export { Default, Disabled, SideBySideWithSelect, TopAligned, WithSeparator };
