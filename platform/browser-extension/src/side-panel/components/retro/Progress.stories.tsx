import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './Progress';

const meta: Meta<typeof Progress> = { title: 'Retro/Progress', component: Progress };

type Story = StoryObj<typeof Progress>;

const Default: Story = { args: { value: 60 } };
const Empty: Story = { args: { value: 0 } };
const Full: Story = { args: { value: 100 } };

const Destructive: Story = {
  args: { value: 25, indicatorClassName: 'bg-destructive' },
};

export default meta;
export { Default, Destructive, Empty, Full };
