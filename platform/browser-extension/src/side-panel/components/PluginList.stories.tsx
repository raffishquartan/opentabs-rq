import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { FailedPluginState, PluginState } from '../bridge';
import { PluginList } from './PluginList';

const mockPlugin = (overrides?: Partial<PluginState>): PluginState => ({
  name: 'slack',
  displayName: 'Slack',
  version: '0.1.0',
  permission: 'auto',
  source: 'local',
  tabState: 'ready',
  urlPatterns: ['*://*.slack.com/*'],
  sdkVersion: '0.0.3',
  tools: [
    {
      name: 'send_message',
      displayName: 'Send Message',
      description: 'Send a message to a channel',
      icon: 'send',
      permission: 'auto',
    },
    {
      name: 'list_channels',
      displayName: 'List Channels',
      description: 'List all channels',
      icon: 'list',
      permission: 'auto',
    },
  ],
  ...overrides,
});

const mockPlugins: PluginState[] = [
  mockPlugin(),
  mockPlugin({
    name: 'github',
    displayName: 'GitHub',
    urlPatterns: ['*://github.com/*'],
    tabState: 'closed',
    tools: [
      {
        name: 'create_issue',
        displayName: 'Create Issue',
        description: 'Create a new issue',
        icon: 'plus',
        permission: 'auto',
      },
      {
        name: 'list_prs',
        displayName: 'List PRs',
        description: 'List pull requests',
        icon: 'git-pull-request',
        permission: 'auto',
      },
    ],
  }),
  mockPlugin({
    name: 'datadog',
    displayName: 'Datadog',
    urlPatterns: ['*://*.datadoghq.com/*'],
    tabState: 'unavailable',
    source: 'npm',
    tools: [
      {
        name: 'query_metrics',
        displayName: 'Query Metrics',
        description: 'Query metrics data',
        icon: 'bar-chart',
        permission: 'auto',
      },
    ],
  }),
];

const mockFailedPlugins: FailedPluginState[] = [
  { specifier: '/Users/dev/plugins/broken-auth', error: 'Missing dist/tools.json — run opentabs-plugin build' },
  { specifier: '@opentabs-dev/plugin-legacy', error: 'SDK version 0.0.1 is incompatible with server 0.0.3' },
];

const allReadyPlugins: PluginState[] = [
  mockPlugin(),
  mockPlugin({
    name: 'github',
    displayName: 'GitHub',
    urlPatterns: ['*://github.com/*'],
    tabState: 'ready',
    tools: [
      {
        name: 'create_issue',
        displayName: 'Create Issue',
        description: 'Create a new issue',
        icon: 'plus',
        permission: 'auto',
      },
    ],
  }),
  mockPlugin({
    name: 'datadog',
    displayName: 'Datadog',
    urlPatterns: ['*://*.datadoghq.com/*'],
    tabState: 'ready',
    source: 'npm',
    tools: [
      {
        name: 'query_metrics',
        displayName: 'Query Metrics',
        description: 'Query metrics data',
        icon: 'bar-chart',
        permission: 'auto',
      },
    ],
  }),
];

const allNotReadyPlugins: PluginState[] = [
  mockPlugin({ tabState: 'closed' }),
  mockPlugin({
    name: 'github',
    displayName: 'GitHub',
    urlPatterns: ['*://github.com/*'],
    tabState: 'closed',
    tools: [
      {
        name: 'create_issue',
        displayName: 'Create Issue',
        description: 'Create a new issue',
        icon: 'plus',
        permission: 'auto',
      },
    ],
  }),
  mockPlugin({
    name: 'datadog',
    displayName: 'Datadog',
    urlPatterns: ['*://*.datadoghq.com/*'],
    tabState: 'unavailable',
    source: 'npm',
    tools: [
      {
        name: 'query_metrics',
        displayName: 'Query Metrics',
        description: 'Query metrics data',
        icon: 'bar-chart',
        permission: 'auto',
      },
    ],
  }),
];

const mixedReadinessPlugins: PluginState[] = [
  mockPlugin(),
  mockPlugin({
    name: 'github',
    displayName: 'GitHub',
    urlPatterns: ['*://github.com/*'],
    tabState: 'ready',
    tools: [
      {
        name: 'create_issue',
        displayName: 'Create Issue',
        description: 'Create a new issue',
        icon: 'plus',
        permission: 'auto',
      },
    ],
  }),
  mockPlugin({
    name: 'datadog',
    displayName: 'Datadog',
    urlPatterns: ['*://*.datadoghq.com/*'],
    tabState: 'unavailable',
    source: 'npm',
    tools: [
      {
        name: 'query_metrics',
        displayName: 'Query Metrics',
        description: 'Query metrics data',
        icon: 'bar-chart',
        permission: 'auto',
      },
    ],
  }),
  mockPlugin({
    name: 'jira',
    displayName: 'Jira',
    urlPatterns: ['*://*.atlassian.net/*'],
    tabState: 'closed',
    tools: [
      {
        name: 'create_ticket',
        displayName: 'Create Ticket',
        description: 'Create a new Jira ticket',
        icon: 'ticket',
        permission: 'auto',
      },
    ],
  }),
];

const meta: Meta<typeof PluginList> = {
  title: 'Components/PluginList',
  component: PluginList,
  decorators: [Story => <div className="w-80">{Story()}</div>],
};

type Story = StoryObj<typeof PluginList>;

const DefaultDemo = () => {
  const [plugins, setPlugins] = useState(mockPlugins);
  return (
    <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
  );
};

const Default: Story = {
  render: () => <DefaultDemo />,
};

const WithFailedPluginsDemo = () => {
  const [plugins, setPlugins] = useState(mockPlugins);
  return (
    <PluginList
      plugins={plugins}
      failedPlugins={mockFailedPlugins}
      activeTools={new Set()}
      setPlugins={setPlugins}
      toolFilter=""
    />
  );
};

const WithFailedPlugins: Story = {
  render: () => <WithFailedPluginsDemo />,
};

const FilteredByToolDemo = () => {
  const [plugins, setPlugins] = useState(mockPlugins);
  return (
    <PluginList
      plugins={plugins}
      failedPlugins={[]}
      activeTools={new Set()}
      setPlugins={setPlugins}
      toolFilter="send"
    />
  );
};

const FilteredByTool: Story = {
  render: () => <FilteredByToolDemo />,
};

const NoFilterMatchDemo = () => {
  const [plugins, setPlugins] = useState(mockPlugins);
  return (
    <PluginList
      plugins={plugins}
      failedPlugins={mockFailedPlugins}
      activeTools={new Set()}
      setPlugins={setPlugins}
      toolFilter="nonexistent"
    />
  );
};

const NoFilterMatch: Story = {
  render: () => <NoFilterMatchDemo />,
};

const AllReadyDemo = () => {
  const [plugins, setPlugins] = useState(allReadyPlugins);
  return (
    <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
  );
};

const AllReady: Story = {
  render: () => <AllReadyDemo />,
};

const AllNotReadyDemo = () => {
  const [plugins, setPlugins] = useState(allNotReadyPlugins);
  return (
    <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
  );
};

const AllNotReady: Story = {
  render: () => <AllNotReadyDemo />,
};

const MixedReadinessDemo = () => {
  const [plugins, setPlugins] = useState(mixedReadinessPlugins);
  return (
    <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
  );
};

const MixedReadiness: Story = {
  render: () => <MixedReadinessDemo />,
};

export default meta;
export { Default, WithFailedPlugins, FilteredByTool, NoFilterMatch, AllReady, AllNotReady, MixedReadiness };
