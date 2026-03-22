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

const LongContentDemo = ({ variant }: { variant?: 'default' | 'primary' | 'solid' }) => (
  <Tooltip.Provider delayDuration={0}>
    <Tooltip defaultOpen>
      <Tooltip.Trigger asChild>
        <Button size="sm">Long content</Button>
      </Tooltip.Trigger>
      <Tooltip.Content variant={variant}>
        Send a message to a channel or direct message conversation. Supports rich text formatting, mentions, emoji
        reactions, and thread replies with optional broadcast to channel.
      </Tooltip.Content>
    </Tooltip>
  </Tooltip.Provider>
);

const Default: Story = { render: () => <TooltipDemo /> };
const Primary: Story = { render: () => <TooltipDemo variant="primary" /> };
const Solid: Story = { render: () => <TooltipDemo variant="solid" /> };
const LongContent: Story = { render: () => <LongContentDemo /> };
const Positions: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-16 p-24">
      {(['top', 'right', 'bottom', 'left'] as const).map(side => (
        <Tooltip.Provider key={side} delayDuration={0}>
          <Tooltip defaultOpen>
            <Tooltip.Trigger asChild>
              <Button size="sm">{side}</Button>
            </Tooltip.Trigger>
            <Tooltip.Content side={side}>{side} tooltip</Tooltip.Content>
          </Tooltip>
        </Tooltip.Provider>
      ))}
    </div>
  ),
};

export default meta;
export { Default, LongContent, Positions, Primary, Solid };
