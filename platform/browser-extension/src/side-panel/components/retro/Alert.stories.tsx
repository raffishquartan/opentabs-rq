import type { Meta, StoryObj } from '@storybook/react';
import { ThemeGrid } from '../storybook-helpers';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Retro/Alert',
  component: Alert,
  argTypes: {
    variant: { control: 'select', options: ['default', 'solid'] },
    status: { control: 'select', options: ['error', 'success', 'warning', 'info'] },
  },
};

type Story = StoryObj<typeof Alert>;

const ErrorStory: Story = {
  render: () => (
    <Alert status="error">
      <Alert.Title>Error</Alert.Title>
      <Alert.Description>Something went wrong.</Alert.Description>
    </Alert>
  ),
};

const Success: Story = {
  render: () => (
    <Alert status="success">
      <Alert.Title>Success</Alert.Title>
      <Alert.Description>Done.</Alert.Description>
    </Alert>
  ),
};

const Warning: Story = {
  render: () => (
    <Alert status="warning">
      <Alert.Title>Warning</Alert.Title>
      <Alert.Description>Attention needed.</Alert.Description>
    </Alert>
  ),
};

const Info: Story = {
  render: () => (
    <Alert status="info">
      <Alert.Title>Info</Alert.Title>
      <Alert.Description>Additional info.</Alert.Description>
    </Alert>
  ),
};

const AllStatuses: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      {(['error', 'success', 'warning', 'info'] as const).map(status => (
        <Alert key={status} status={status}>
          <Alert.Title>{status.charAt(0).toUpperCase() + status.slice(1)}</Alert.Title>
          <Alert.Description>This is a {status} alert.</Alert.Description>
        </Alert>
      ))}
    </div>
  ),
};

const ThemePair: Story = {
  render: () => (
    <ThemeGrid>
      <div className="flex flex-col gap-3">
        <Alert status="error">
          <Alert.Title>Error</Alert.Title>
          <Alert.Description>Something went wrong.</Alert.Description>
        </Alert>
        <Alert status="success">
          <Alert.Title>Success</Alert.Title>
          <Alert.Description>Done.</Alert.Description>
        </Alert>
      </div>
    </ThemeGrid>
  ),
};

const Solid: Story = {
  render: () => (
    <Alert variant="solid">
      <Alert.Title>Solid Variant</Alert.Title>
      <Alert.Description>This alert uses the solid variant with inverted colors.</Alert.Description>
    </Alert>
  ),
};

const AllVariantsAndStatuses: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Alert variant="default">
        <Alert.Title>Default (no status)</Alert.Title>
        <Alert.Description>Default variant with no status applied.</Alert.Description>
      </Alert>
      <Alert variant="solid">
        <Alert.Title>Solid (no status)</Alert.Title>
        <Alert.Description>Solid variant with inverted colors.</Alert.Description>
      </Alert>
      {(['error', 'success', 'warning', 'info'] as const).map(status => (
        <Alert key={status} status={status}>
          <Alert.Title>Default + {status}</Alert.Title>
          <Alert.Description>Default variant with {status} status.</Alert.Description>
        </Alert>
      ))}
    </div>
  ),
};

export default meta;
export { AllStatuses, AllVariantsAndStatuses, ErrorStory, Info, Solid, Success, ThemePair, Warning };
