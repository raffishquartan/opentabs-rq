import { Progress } from './Progress';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Progress> = { title: 'Retro/Progress', component: Progress };

type Story = StoryObj<typeof Progress>;

const Empty: Story = {
  render: () => <Progress value={0} />,
};

const HalfFull: Story = {
  render: () => <Progress value={50} />,
};

const Complete: Story = {
  render: () => <Progress value={100} />,
};

const CustomClassName: Story = {
  render: () => <Progress value={75} className="h-6" />,
};

export default meta;
export { Empty, HalfFull, Complete, CustomClassName };
