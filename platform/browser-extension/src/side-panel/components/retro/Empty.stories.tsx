import type { Meta, StoryObj } from '@storybook/react';
import { FolderOpen } from 'lucide-react';
import { Empty } from './Empty';

const meta: Meta = {
  title: 'Retro/Empty',
  decorators: [Story => <div className="w-80">{Story()}</div>],
};

type Story = StoryObj;

const Default: Story = {
  render: () => (
    <Empty>
      <Empty.Content>
        <Empty.Icon className="h-12 w-12 text-muted-foreground" />
        <Empty.Title>Nothing Here</Empty.Title>
        <Empty.Separator />
        <Empty.Description>No items to display.</Empty.Description>
      </Empty.Content>
    </Empty>
  ),
};

const TitleOnly: Story = {
  render: () => (
    <Empty>
      <Empty.Content>
        <Empty.Title>Nothing Here</Empty.Title>
      </Empty.Content>
    </Empty>
  ),
};

const CustomIcon: Story = {
  render: () => (
    <Empty>
      <Empty.Content>
        <Empty.Icon className="h-12 w-12 text-muted-foreground">
          <FolderOpen className="h-full w-full" />
        </Empty.Icon>
        <Empty.Title>No Files</Empty.Title>
        <Empty.Separator />
        <Empty.Description>This folder is empty.</Empty.Description>
      </Empty.Content>
    </Empty>
  ),
};

const NoSeparator: Story = {
  render: () => (
    <Empty>
      <Empty.Content>
        <Empty.Icon className="h-12 w-12 text-muted-foreground" />
        <Empty.Title>Nothing Here</Empty.Title>
        <Empty.Description>No items to display.</Empty.Description>
      </Empty.Content>
    </Empty>
  ),
};

const AllVariants: Story = {
  decorators: [Story => <div className="w-[700px]">{Story()}</div>],
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="w-80">
          <Empty>
            <Empty.Content>
              <Empty.Icon className="h-12 w-12 text-muted-foreground" />
              <Empty.Title>Nothing Here</Empty.Title>
              <Empty.Separator />
              <Empty.Description>No items to display.</Empty.Description>
            </Empty.Content>
          </Empty>
        </div>
        <div className="w-80">
          <Empty>
            <Empty.Content>
              <Empty.Title>Nothing Here</Empty.Title>
            </Empty.Content>
          </Empty>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="w-80">
          <Empty>
            <Empty.Content>
              <Empty.Icon className="h-12 w-12 text-muted-foreground">
                <FolderOpen className="h-full w-full" />
              </Empty.Icon>
              <Empty.Title>No Files</Empty.Title>
              <Empty.Separator />
              <Empty.Description>This folder is empty.</Empty.Description>
            </Empty.Content>
          </Empty>
        </div>
        <div className="w-80">
          <Empty>
            <Empty.Content>
              <Empty.Icon className="h-12 w-12 text-muted-foreground" />
              <Empty.Title>Nothing Here</Empty.Title>
              <Empty.Description>No items to display.</Empty.Description>
            </Empty.Content>
          </Empty>
        </div>
      </div>
    </div>
  ),
};

export default meta;
export { AllVariants, CustomIcon, Default, NoSeparator, TitleOnly };
