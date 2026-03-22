import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Switch } from './Switch';

const meta: Meta<typeof Switch> = { title: 'Retro/Switch', component: Switch };

type Story = StoryObj<typeof Switch>;

const Default: Story = { args: { defaultChecked: false } };
const Checked: Story = { args: { defaultChecked: true } };
const Disabled: Story = { args: { disabled: true } };

const InteractiveDemo = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Switch checked={checked} onCheckedChange={setChecked} />
      <span className="font-sans text-foreground text-sm">{checked ? 'On' : 'Off'}</span>
    </div>
  );
};

const Interactive: Story = {
  render: () => <InteractiveDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switchEl = canvas.getByRole('switch');
    await expect(switchEl).toHaveAttribute('data-state', 'unchecked');
    await userEvent.click(switchEl);
    await expect(switchEl).toHaveAttribute('data-state', 'checked');
  },
};

export default meta;
export { Checked, Default, Disabled, Interactive };
