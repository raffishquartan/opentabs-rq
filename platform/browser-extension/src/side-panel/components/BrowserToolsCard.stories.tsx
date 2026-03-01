import { BrowserToolsCard } from './BrowserToolsCard';
import { Accordion } from './retro/Accordion';
import { useState } from 'react';
import type { BrowserToolState } from '../bridge';
import type { Meta, StoryObj } from '@storybook/react';

const mockBrowserTools: BrowserToolState[] = [
  { name: 'browser_list_tabs', description: 'List all open browser tabs', enabled: true },
  { name: 'browser_open_tab', description: 'Open a new browser tab with a URL', enabled: true },
  { name: 'browser_screenshot_tab', description: 'Capture a screenshot of a tab', enabled: true },
  { name: 'browser_click_element', description: 'Click an element matching a CSS selector', enabled: true },
  { name: 'browser_execute_script', description: 'Execute JavaScript in a tab', enabled: false },
];

const meta: Meta<typeof BrowserToolsCard> = {
  title: 'Components/BrowserToolsCard',
  component: BrowserToolsCard,
  decorators: [
    Story => (
      <div className="w-80">
        <Accordion type="multiple" defaultValue={['browser-tools']}>
          {Story()}
        </Accordion>
      </div>
    ),
  ],
};

type Story = StoryObj<typeof BrowserToolsCard>;

const DefaultDemo = () => {
  const [tools, setTools] = useState(mockBrowserTools.map(t => ({ ...t, enabled: true })));
  return <BrowserToolsCard tools={tools} activeTools={new Set()} onToolsChange={updater => setTools(updater)} />;
};

const Default: Story = {
  render: () => <DefaultDemo />,
};

const SomeDisabledDemo = () => {
  const [tools, setTools] = useState(mockBrowserTools);
  return <BrowserToolsCard tools={tools} activeTools={new Set()} onToolsChange={updater => setTools(updater)} />;
};

const SomeDisabled: Story = {
  render: () => <SomeDisabledDemo />,
};

const AllDisabledDemo = () => {
  const [tools, setTools] = useState(mockBrowserTools.map(t => ({ ...t, enabled: false })));
  return <BrowserToolsCard tools={tools} activeTools={new Set()} onToolsChange={updater => setTools(updater)} />;
};

const AllDisabled: Story = {
  render: () => <AllDisabledDemo />,
};

const WithActiveToolDemo = () => {
  const [tools, setTools] = useState(mockBrowserTools.map(t => ({ ...t, enabled: true })));
  return (
    <BrowserToolsCard
      tools={tools}
      activeTools={new Set(['browser:browser_list_tabs'])}
      onToolsChange={updater => setTools(updater)}
    />
  );
};

const WithActiveTool: Story = {
  render: () => <WithActiveToolDemo />,
};

const WithToolFilterDemo = () => {
  const [tools, setTools] = useState(mockBrowserTools.map(t => ({ ...t, enabled: true })));
  return (
    <BrowserToolsCard
      tools={tools}
      activeTools={new Set()}
      onToolsChange={updater => setTools(updater)}
      toolFilter="screenshot"
    />
  );
};

const WithToolFilter: Story = {
  render: () => <WithToolFilterDemo />,
};

const interactiveTools: BrowserToolState[] = [
  ...mockBrowserTools,
  { name: 'extension_get_state', description: 'Get extension internal state', enabled: true },
];

const InteractiveDemo = () => {
  const [tools, setTools] = useState(interactiveTools);
  return <BrowserToolsCard tools={tools} activeTools={new Set()} onToolsChange={updater => setTools(updater)} />;
};

const Interactive: Story = {
  render: () => <InteractiveDemo />,
};

export default meta;
export { Default, SomeDisabled, AllDisabled, WithActiveTool, WithToolFilter, Interactive };
