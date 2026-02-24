import { Badge } from './Badge';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Badge> = { title: 'Retro/Badge', component: Badge };

type Story = StoryObj<typeof Badge>;

const Default: Story = {
  render: () => <Badge>Default</Badge>,
};

const Outline: Story = {
  render: () => <Badge variant="outline">Outline</Badge>,
};

const Solid: Story = {
  render: () => <Badge variant="solid">Solid</Badge>,
};

const Surface: Story = {
  render: () => <Badge variant="surface">Surface</Badge>,
};

const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['default', 'outline', 'solid', 'surface'] as const).map(variant => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};

const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {(['sm', 'md', 'lg'] as const).map(size => (
        <Badge key={size} size={size}>
          {size}
        </Badge>
      ))}
    </div>
  ),
};

export default meta;
export { Default, Outline, Solid, Surface, AllVariants, AllSizes };
