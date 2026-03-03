import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import type { ConfirmationData } from './ConfirmationDialog';
import { ConfirmationDialog } from './ConfirmationDialog';

const mockConfirmation = (overrides?: Partial<ConfirmationData>): ConfirmationData => ({
  id: 'conf-1',
  tool: 'slack_send_message',
  domain: 'app.slack.com',
  paramsPreview: '',
  timeoutMs: 30_000,
  receivedAt: Date.now(),
  ...overrides,
});

const meta: Meta<typeof ConfirmationDialog> = {
  title: 'Components/ConfirmationDialog',
  component: ConfirmationDialog,
  decorators: [Story => <div className="w-80">{Story()}</div>],
  args: {
    onRespond: fn(),
    onDenyAll: fn(),
  },
};

type Story = StoryObj<typeof ConfirmationDialog>;

const SingleConfirmation: Story = {
  args: {
    confirmations: [mockConfirmation()],
  },
};

const WithParamsPreview: Story = {
  args: {
    confirmations: [
      mockConfirmation({
        id: 'conf-params',
        tool: 'slack_send_message',
        paramsPreview: JSON.stringify({ channel: '#general', message: 'Hello team!' }, null, 2),
      }),
    ],
  },
};

const NoDomain: Story = {
  args: {
    confirmations: [
      mockConfirmation({
        id: 'conf-no-domain',
        tool: 'browser_execute_script',
        domain: null,
      }),
    ],
  },
};

const MultipleConfirmations: Story = {
  args: {
    confirmations: [
      mockConfirmation({ id: 'conf-1', tool: 'slack_send_message', domain: 'app.slack.com' }),
      mockConfirmation({ id: 'conf-2', tool: 'github_create_issue', domain: 'github.com' }),
      mockConfirmation({ id: 'conf-3', tool: 'browser_open_tab', domain: null }),
    ],
  },
};

export default meta;
export { SingleConfirmation, WithParamsPreview, NoDomain, MultipleConfirmations };
