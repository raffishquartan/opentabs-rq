import { DisconnectedState, LoadingState } from './EmptyStates';
import { OnboardingState } from './OnboardingState';
import { PluginList } from './PluginList';
import { Button } from './retro/Button';
import { Input } from './retro/Input';
import { ReturningUserEmptyState } from './ReturningUserEmptyState';
import { Moon, Search, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import type { FailedPluginState, PluginState } from '../bridge';
import type { Meta, StoryObj } from '@storybook/react';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockPlugin = (overrides?: Partial<PluginState>): PluginState => ({
  name: 'slack',
  displayName: 'Slack',
  version: '0.1.0',
  trustTier: 'local',
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
      enabled: true,
    },
    {
      name: 'list_channels',
      displayName: 'List Channels',
      description: 'List all channels',
      icon: 'list',
      enabled: true,
    },
    { name: 'search', displayName: 'Search', description: 'Search messages and files', icon: 'search', enabled: true },
  ],
  ...overrides,
});

const githubPlugin = (): PluginState =>
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
        enabled: true,
      },
      {
        name: 'list_prs',
        displayName: 'List PRs',
        description: 'List pull requests',
        icon: 'git-pull-request',
        enabled: true,
      },
    ],
  });

const datadogPlugin = (): PluginState =>
  mockPlugin({
    name: 'datadog',
    displayName: 'Datadog',
    urlPatterns: ['*://*.datadoghq.com/*'],
    tabState: 'unavailable',
    source: 'npm',
    trustTier: 'community',
    tools: [
      {
        name: 'query_metrics',
        displayName: 'Query Metrics',
        description: 'Query time-series metrics',
        icon: 'bar-chart',
        enabled: true,
      },
      {
        name: 'list_monitors',
        displayName: 'List Monitors',
        description: 'List active monitors',
        icon: 'activity',
        enabled: true,
      },
    ],
  });

const linearPlugin = (): PluginState =>
  mockPlugin({
    name: 'linear',
    displayName: 'Linear',
    urlPatterns: ['*://linear.app/*'],
    tabState: 'ready',
    tools: [
      {
        name: 'create_issue',
        displayName: 'Create Issue',
        description: 'Create a new issue',
        icon: 'plus',
        enabled: true,
      },
      {
        name: 'list_issues',
        displayName: 'List Issues',
        description: 'List issues in a project',
        icon: 'list',
        enabled: true,
      },
      {
        name: 'update_issue',
        displayName: 'Update Issue',
        description: 'Update an existing issue',
        icon: 'pencil',
        enabled: true,
      },
      {
        name: 'search_issues',
        displayName: 'Search Issues',
        description: 'Search across all issues',
        icon: 'search',
        enabled: true,
      },
    ],
  });

const jiraPlugin = (): PluginState =>
  mockPlugin({
    name: 'jira',
    displayName: 'Jira',
    urlPatterns: ['*://*.atlassian.net/*'],
    tabState: 'ready',
    source: 'npm',
    trustTier: 'official',
    tools: [
      {
        name: 'create_ticket',
        displayName: 'Create Ticket',
        description: 'Create a new Jira ticket',
        icon: 'plus',
        enabled: true,
      },
      { name: 'search', displayName: 'Search', description: 'Search issues with JQL', icon: 'search', enabled: true },
      {
        name: 'get_sprint',
        displayName: 'Get Sprint',
        description: 'Get current sprint details',
        icon: 'zap',
        enabled: true,
      },
      {
        name: 'update_ticket',
        displayName: 'Update Ticket',
        description: 'Update a ticket',
        icon: 'pencil',
        enabled: true,
      },
      {
        name: 'list_boards',
        displayName: 'List Boards',
        description: 'List all boards',
        icon: 'layout-grid',
        enabled: true,
      },
      { name: 'get_board', displayName: 'Get Board', description: 'Get board details', icon: 'trello', enabled: true },
    ],
  });

const mockFailedPlugins: FailedPluginState[] = [
  { specifier: '/Users/dev/plugins/broken', error: 'Missing dist/tools.json' },
  { specifier: 'opentabs-plugin-notion', error: 'SDK version 0.1.0 is newer than server 0.0.3 — rebuild the plugin' },
];

// ---------------------------------------------------------------------------
// Inline Footer (avoids chrome.storage dependency from useTheme)
// ---------------------------------------------------------------------------

const FooterPreview = () => {
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    setDark(next);
  };

  return (
    <footer className="border-border bg-card sticky bottom-0 flex items-center border-t-2 px-3 py-3 text-sm">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-9 w-9" asChild>
          <a
            href="https://github.com/opentabs-dev/opentabs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </Button>
        <Button variant="outline" size="icon" onClick={toggle} className="h-9 w-9" aria-label="Toggle theme">
          {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>
      </div>
    </footer>
  );
};

// ---------------------------------------------------------------------------
// Shell — replicates App.tsx layout without Chrome API dependencies
// ---------------------------------------------------------------------------

const SidePanelShell = ({
  children,
  searchBar,
  centered = false,
}: {
  children: React.ReactNode;
  searchBar?: React.ReactNode;
  centered?: boolean;
}) => (
  <div className="text-foreground flex min-h-screen flex-col">
    {searchBar}
    <main className={`flex-1 px-3 py-2 ${centered ? 'flex items-center justify-center' : ''}`}>{children}</main>
    <FooterPreview />
  </div>
);

// ---------------------------------------------------------------------------
// Search bar — matches App.tsx exactly
// ---------------------------------------------------------------------------

const SearchBar = ({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) => (
  <div className="px-3 py-2">
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Filter tools..."
        className="pr-8 pl-9"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'SidePanel/Assembled',
  decorators: [Story => <div className="w-80">{Story()}</div>],
};

type Story = StoryObj;

// ---------------------------------------------------------------------------
// 1–4: Static empty states
// ---------------------------------------------------------------------------

const Loading: Story = {
  render: () => (
    <SidePanelShell centered>
      <LoadingState />
    </SidePanelShell>
  ),
};

const Disconnected: Story = {
  render: () => (
    <SidePanelShell centered>
      <DisconnectedState />
    </SidePanelShell>
  ),
};

const FirstTimeUser: Story = {
  render: () => (
    <SidePanelShell centered>
      <OnboardingState connected={true} pluginCount={0} />
    </SidePanelShell>
  ),
};

const ReturningUser: Story = {
  render: () => (
    <SidePanelShell centered>
      <ReturningUserEmptyState onResetOnboarding={fn()} />
    </SidePanelShell>
  ),
};

// ---------------------------------------------------------------------------
// 5–7: Single plugin states
// ---------------------------------------------------------------------------

const SinglePluginReadyDemo = () => {
  const [plugins, setPlugins] = useState([mockPlugin()]);
  return (
    <SidePanelShell>
      <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
    </SidePanelShell>
  );
};

const SinglePluginReady: Story = { render: () => <SinglePluginReadyDemo /> };

const SinglePluginClosedDemo = () => {
  const [plugins, setPlugins] = useState([mockPlugin({ tabState: 'closed' })]);
  return (
    <SidePanelShell>
      <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
    </SidePanelShell>
  );
};

const SinglePluginClosed: Story = { render: () => <SinglePluginClosedDemo /> };

const SinglePluginUnavailableDemo = () => {
  const [plugins, setPlugins] = useState([mockPlugin({ tabState: 'unavailable' })]);
  return (
    <SidePanelShell>
      <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
    </SidePanelShell>
  );
};

const SinglePluginUnavailable: Story = { render: () => <SinglePluginUnavailableDemo /> };

// ---------------------------------------------------------------------------
// 8: Multiple plugins with mixed tab states
// ---------------------------------------------------------------------------

const MultiplePluginsMixedDemo = () => {
  const [plugins, setPlugins] = useState([mockPlugin(), githubPlugin(), datadogPlugin()]);
  return (
    <SidePanelShell>
      <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
    </SidePanelShell>
  );
};

const MultiplePluginsMixed: Story = { render: () => <MultiplePluginsMixedDemo /> };

// ---------------------------------------------------------------------------
// 9: Working plugins + failed plugins
// ---------------------------------------------------------------------------

const WithFailedPluginsDemo = () => {
  const [plugins, setPlugins] = useState([mockPlugin(), githubPlugin()]);
  return (
    <SidePanelShell>
      <PluginList
        plugins={plugins}
        failedPlugins={mockFailedPlugins}
        activeTools={new Set()}
        setPlugins={setPlugins}
        toolFilter=""
      />
    </SidePanelShell>
  );
};

const WithFailedPlugins: Story = { render: () => <WithFailedPluginsDemo /> };

// ---------------------------------------------------------------------------
// 10: Many tools (>5 total) with search bar
// ---------------------------------------------------------------------------

const ManyToolsWithSearchDemo = () => {
  const [plugins, setPlugins] = useState([mockPlugin(), linearPlugin(), jiraPlugin()]);
  const [toolFilter, setToolFilter] = useState('');
  return (
    <SidePanelShell
      searchBar={<SearchBar value={toolFilter} onChange={setToolFilter} onClear={() => setToolFilter('')} />}>
      <PluginList
        plugins={plugins}
        failedPlugins={[]}
        activeTools={new Set()}
        setPlugins={setPlugins}
        toolFilter={toolFilter}
      />
    </SidePanelShell>
  );
};

const ManyToolsWithSearch: Story = { render: () => <ManyToolsWithSearchDemo /> };

// ---------------------------------------------------------------------------
// 11: Active tool execution (loader animations)
// ---------------------------------------------------------------------------

const ActiveToolExecutionDemo = () => {
  const [plugins, setPlugins] = useState([mockPlugin()]);
  return (
    <SidePanelShell>
      <PluginList
        plugins={plugins}
        failedPlugins={[]}
        activeTools={new Set(['slack:send_message', 'slack:search'])}
        setPlugins={setPlugins}
        toolFilter=""
      />
    </SidePanelShell>
  );
};

const ActiveToolExecution: Story = { render: () => <ActiveToolExecutionDemo /> };

// ---------------------------------------------------------------------------
// 12: All tools disabled
// ---------------------------------------------------------------------------

const AllToolsDisabledDemo = () => {
  const [plugins, setPlugins] = useState([
    mockPlugin({
      tools: [
        {
          name: 'send_message',
          displayName: 'Send Message',
          description: 'Send a message to a channel',
          icon: 'send',
          enabled: false,
        },
        {
          name: 'list_channels',
          displayName: 'List Channels',
          description: 'List all channels',
          icon: 'list',
          enabled: false,
        },
        {
          name: 'search',
          displayName: 'Search',
          description: 'Search messages and files',
          icon: 'search',
          enabled: false,
        },
      ],
    }),
  ]);
  return (
    <SidePanelShell>
      <PluginList plugins={plugins} failedPlugins={[]} activeTools={new Set()} setPlugins={setPlugins} toolFilter="" />
    </SidePanelShell>
  );
};

const AllToolsDisabled: Story = { render: () => <AllToolsDisabledDemo /> };

// ---------------------------------------------------------------------------
// 13: Tool filter active (pre-filled search)
// ---------------------------------------------------------------------------

const ToolFilterActiveDemo = () => {
  const [plugins, setPlugins] = useState([mockPlugin(), linearPlugin(), jiraPlugin()]);
  const [toolFilter, setToolFilter] = useState('search');
  return (
    <SidePanelShell
      searchBar={<SearchBar value={toolFilter} onChange={setToolFilter} onClear={() => setToolFilter('')} />}>
      <PluginList
        plugins={plugins}
        failedPlugins={[]}
        activeTools={new Set()}
        setPlugins={setPlugins}
        toolFilter={toolFilter}
      />
    </SidePanelShell>
  );
};

const ToolFilterActive: Story = { render: () => <ToolFilterActiveDemo /> };

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default meta;
export {
  Loading,
  Disconnected,
  FirstTimeUser,
  ReturningUser,
  SinglePluginReady,
  SinglePluginClosed,
  SinglePluginUnavailable,
  MultiplePluginsMixed,
  WithFailedPlugins,
  ManyToolsWithSearch,
  ActiveToolExecution,
  AllToolsDisabled,
  ToolFilterActive,
};
