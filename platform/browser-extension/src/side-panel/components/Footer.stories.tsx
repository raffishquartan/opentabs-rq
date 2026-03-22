import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { SERVER_PORT_KEY } from '../../constants.js';
import { Footer } from './Footer';

const meta: Meta = {
  title: 'Components/Footer',
  decorators: [Story => <div className="w-80">{Story()}</div>],
};

type Story = StoryObj;

const Default: Story = { render: () => <Footer /> };

const DarkMode: Story = {
  render: () => <Footer />,
  decorators: [
    Story => {
      document.documentElement.classList.add('dark');
      return Story();
    },
  ],
};

const WithCustomPortDemo = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    chrome.storage.local.set({ [SERVER_PORT_KEY]: 3000 }).then(() => {
      setReady(true);
    });
    return () => {
      chrome.storage.local.remove(SERVER_PORT_KEY);
    };
  }, []);

  if (!ready) return null;
  return <Footer />;
};

const WithCustomPort: Story = {
  render: () => <WithCustomPortDemo />,
};

export default meta;
export { DarkMode, Default, WithCustomPort };
