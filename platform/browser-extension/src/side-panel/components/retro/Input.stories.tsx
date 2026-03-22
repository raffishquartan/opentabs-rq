import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Retro/Input',
  component: Input,
  decorators: [Story => <div className="w-64">{Story()}</div>],
};

type Story = StoryObj<typeof Input>;

const Default: Story = { args: { placeholder: 'Enter text...' } };
const WithValue: Story = { args: { defaultValue: 'Hello world' } };
const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: 'Invalid input' } };
const Disabled: Story = { args: { disabled: true, defaultValue: 'Disabled field' } };

const Typing: Story = {
  args: { placeholder: 'Type here...' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Type here...');
    await userEvent.type(input, 'Hello world');
    await expect(input).toHaveValue('Hello world');
  },
};

export default meta;
export { Default, Disabled, Invalid, Typing, WithValue };
