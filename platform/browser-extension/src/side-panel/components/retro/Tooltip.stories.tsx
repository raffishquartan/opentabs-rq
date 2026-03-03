import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

const meta: Meta = {
  title: 'Retro/Tooltip',
  decorators: [Story => <div className="p-16">{Story()}</div>],
};

type Story = StoryObj;

const TooltipDemo = ({ variant }: { variant?: 'default' | 'primary' | 'solid' }) => (
  <Tooltip.Provider delayDuration={0}>
    <Tooltip defaultOpen>
      <Tooltip.Trigger asChild>
        <Button size="sm">Hover me</Button>
      </Tooltip.Trigger>
      <Tooltip.Content variant={variant}>Tooltip content</Tooltip.Content>
    </Tooltip>
  </Tooltip.Provider>
);

const Default: Story = { render: () => <TooltipDemo /> };
const Primary: Story = { render: () => <TooltipDemo variant="primary" /> };
const Solid: Story = { render: () => <TooltipDemo variant="solid" /> };

export default meta;
export { Default, Primary, Solid };
