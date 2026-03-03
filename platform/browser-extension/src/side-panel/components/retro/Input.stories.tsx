import type { Meta, StoryObj } from '@storybook/react';
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

export default meta;
export { Default, WithValue, Invalid, Disabled };
