import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = { title: 'Retro/Badge', component: Badge };

type Story = StoryObj<typeof Badge>;

const Default: Story = {
  render: () => <Badge>DEV</Badge>,
};

const Outline: Story = {
  render: () => <Badge variant="outline">SDK</Badge>,
};

const Small: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm">DEV</Badge>
      <Badge variant="outline" size="sm">
        SDK
      </Badge>
    </div>
  ),
};

const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge variant="default" size="sm">
        default sm
      </Badge>
      <Badge variant="default" size="md">
        default md
      </Badge>
      <Badge variant="outline" size="sm">
        outline sm
      </Badge>
      <Badge variant="outline" size="md">
        outline md
      </Badge>
    </div>
  ),
};

export default meta;
export { AllVariants, Default, Outline, Small };
