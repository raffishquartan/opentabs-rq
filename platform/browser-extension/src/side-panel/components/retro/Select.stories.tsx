import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Select } from './Select';

const meta: Meta = {
  title: 'Retro/Select',
  decorators: [Story => <div className="p-16">{Story()}</div>],
};

type Story = StoryObj;

const Default: Story = {
  render: () => (
    <Select>
      <Select.Trigger>
        <Select.Value placeholder="Pick a fruit" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="apple">Apple</Select.Item>
        <Select.Item value="banana">Banana</Select.Item>
        <Select.Item value="cherry">Cherry</Select.Item>
      </Select.Content>
    </Select>
  ),
};

const Disabled: Story = {
  render: () => (
    <Select>
      <Select.Trigger disabled>
        <Select.Value placeholder="Pick a fruit" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="apple">Apple</Select.Item>
        <Select.Item value="banana">Banana</Select.Item>
        <Select.Item value="cherry">Cherry</Select.Item>
      </Select.Content>
    </Select>
  ),
};

const WithGroups: Story = {
  render: () => (
    <Select>
      <Select.Trigger>
        <Select.Value placeholder="Pick an item" />
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>Fruits</Select.Label>
          <Select.Item value="apple">Apple</Select.Item>
          <Select.Item value="banana">Banana</Select.Item>
          <Select.Item value="cherry">Cherry</Select.Item>
        </Select.Group>
        <Select.Group>
          <Select.Label>Vegetables</Select.Label>
          <Select.Item value="carrot">Carrot</Select.Item>
          <Select.Item value="spinach">Spinach</Select.Item>
        </Select.Group>
      </Select.Content>
    </Select>
  ),
};

const WithSeparator: Story = {
  render: () => (
    <Select>
      <Select.Trigger>
        <Select.Value placeholder="Pick an item" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="apple">Apple</Select.Item>
        <Select.Item value="banana">Banana</Select.Item>
        <Select.Separator className="my-1 h-px bg-border" />
        <Select.Item value="carrot">Carrot</Select.Item>
        <Select.Item value="spinach">Spinach</Select.Item>
      </Select.Content>
    </Select>
  ),
};

const InteractiveDemo = () => {
  const [value, setValue] = useState<string>('');
  return (
    <div className="flex items-center gap-3">
      <Select value={value} onValueChange={setValue}>
        <Select.Trigger>
          <Select.Value placeholder="Pick a fruit" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="apple">Apple</Select.Item>
          <Select.Item value="banana">Banana</Select.Item>
          <Select.Item value="cherry">Cherry</Select.Item>
        </Select.Content>
      </Select>
      <span className="font-sans text-foreground text-sm">{value || 'None selected'}</span>
    </div>
  );
};

const Interactive: Story = {
  render: () => <InteractiveDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');
    await userEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Banana' });
    await userEvent.click(option);
    await expect(canvas.getByText('banana')).toBeInTheDocument();
  },
};

export default meta;
export { Default, Disabled, Interactive, WithGroups, WithSeparator };
