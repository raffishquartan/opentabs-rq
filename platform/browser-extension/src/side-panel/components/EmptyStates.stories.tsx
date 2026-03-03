import type { Meta, StoryObj } from '@storybook/react';
import { DisconnectedState, LoadingState } from './EmptyStates';

const meta: Meta = {
  title: 'Components/EmptyStates',
  decorators: [Story => <div className="w-80">{Story()}</div>],
};

type Story = StoryObj;

const Disconnected: Story = { render: () => <DisconnectedState /> };
const Loading: Story = { render: () => <LoadingState /> };

export default meta;
export { Disconnected, Loading };
