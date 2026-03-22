import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { FailedPluginCard } from './FailedPluginCard';

const meta: Meta<typeof FailedPluginCard> = {
  title: 'Components/FailedPluginCard',
  component: FailedPluginCard,
  decorators: [Story => <div className="w-80">{Story()}</div>],
  args: {
    onRemove: fn(),
    removing: false,
  },
};

type Story = StoryObj<typeof FailedPluginCard>;

const ShortError: Story = {
  args: { plugin: { specifier: '/Users/dev/plugins/broken', error: 'Missing dist/tools.json' } },
};

const LongError: Story = {
  args: {
    plugin: {
      specifier: '/Users/dev/plugins/broken',
      error:
        'Error: Cannot find module "@opentabs-dev/plugin-sdk/tools" from "/Users/dev/plugins/broken/src/index.ts". Make sure the package is installed and the module path is correct. Did you mean to import "@opentabs-dev/plugin-sdk"?',
    },
  },
};

const NpmSpecifier: Story = {
  args: {
    plugin: {
      specifier: '@opentabs-dev/plugin-slack@1.2.3',
      error: 'Failed to load adapter: adapter IIFE threw during evaluation',
    },
  },
};

const Removing: Story = {
  args: {
    plugin: { specifier: '/Users/dev/plugins/broken', error: 'Missing dist/tools.json' },
    removing: true,
  },
};

const AllStates: Story = {
  render: () => (
    <div className="space-y-3">
      <FailedPluginCard
        plugin={{ specifier: '/Users/dev/plugins/broken', error: 'Missing dist/tools.json' }}
        onRemove={fn()}
        removing={false}
      />
      <FailedPluginCard
        plugin={{
          specifier: '/Users/dev/plugins/broken',
          error:
            'Error: Cannot find module "@opentabs-dev/plugin-sdk/tools" from "/Users/dev/plugins/broken/src/index.ts". Make sure the package is installed and the module path is correct. Did you mean to import "@opentabs-dev/plugin-sdk"?',
        }}
        onRemove={fn()}
        removing={false}
      />
      <FailedPluginCard
        plugin={{
          specifier: '@opentabs-dev/plugin-slack@1.2.3',
          error: 'Failed to load adapter: adapter IIFE threw during evaluation',
        }}
        onRemove={fn()}
        removing={false}
      />
      <FailedPluginCard
        plugin={{ specifier: '/Users/dev/plugins/broken', error: 'Missing dist/tools.json' }}
        onRemove={fn()}
        removing={true}
      />
    </div>
  ),
};

export default meta;
export { AllStates, LongError, NpmSpecifier, Removing, ShortError };
