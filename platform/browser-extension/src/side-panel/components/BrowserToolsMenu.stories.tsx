import type { Meta, StoryObj } from '@storybook/react';
import { BrowserToolsMenu } from './BrowserToolsMenu';

const meta: Meta<typeof BrowserToolsMenu> = {
  title: 'Components/BrowserToolsMenu',
  component: BrowserToolsMenu,
  decorators: [Story => <div className="p-8">{Story()}</div>],
};

type Story = StoryObj<typeof BrowserToolsMenu>;

const Default: Story = {
  render: () => <BrowserToolsMenu serverVersion="0.0.42" />,
};

const NoVersion: Story = {
  render: () => <BrowserToolsMenu />,
};

export default meta;
export { Default, NoVersion };
