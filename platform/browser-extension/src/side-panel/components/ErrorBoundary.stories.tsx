import type { Meta, StoryObj } from '@storybook/react';
import { ErrorBoundary } from './ErrorBoundary';

/** Throws during render so ErrorBoundary catches it and shows the fallback UI. */
const Thrower = (): never => {
  throw new Error('Storybook test error');
};

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  decorators: [Story => <div className="w-80">{Story()}</div>],
};

type Story = StoryObj<typeof ErrorBoundary>;

const ErrorState: Story = {
  render: () => (
    <ErrorBoundary>
      <Thrower />
    </ErrorBoundary>
  ),
};

const PassThrough: Story = {
  render: () => (
    <ErrorBoundary>
      <p className="p-4 text-sm">Normal child content rendered without error.</p>
    </ErrorBoundary>
  ),
};

export default meta;
export { ErrorState, PassThrough };
