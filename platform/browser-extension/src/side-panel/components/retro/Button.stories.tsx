import type { Meta, StoryObj } from '@storybook/react';
import { ThemeGrid } from '../storybook-helpers';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Retro/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'outline', 'link', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
    disabled: { control: 'boolean' },
  },
};

type Story = StoryObj<typeof Button>;

const Primary: Story = { args: { children: 'Primary', variant: 'default' } };
const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } };
const Outline: Story = { args: { children: 'Outline', variant: 'outline' } };
const Link: Story = { args: { children: 'Link', variant: 'link' } };
const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } };
const Small: Story = { args: { children: 'Small', size: 'sm' } };
const Large: Story = { args: { children: 'Large', size: 'lg' } };
const Disabled: Story = { args: { children: 'Disabled', disabled: true } };

const Icon: Story = {
  render: () => (
    <div className="flex gap-3">
      {(['default', 'secondary', 'outline'] as const).map(variant => (
        <Button key={variant} variant={variant} size="icon">
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Button>
      ))}
    </div>
  ),
};

const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['default', 'secondary', 'outline', 'link', 'ghost'] as const).map(variant => (
        <div key={variant} className="flex items-center gap-3">
          <span className="w-20 font-mono text-muted-foreground text-xs">{variant}</span>
          {(['sm', 'md', 'lg', 'icon'] as const).map(size => (
            <Button key={size} variant={variant} size={size}>
              {size === 'icon' ? (
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              ) : (
                size
              )}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

const ThemePair: Story = {
  render: () => (
    <ThemeGrid>
      <div className="flex flex-col gap-2">
        <Button variant="default">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </ThemeGrid>
  ),
};

export default meta;
export { AllVariants, Disabled, Ghost, Icon, Large, Link, Outline, Primary, Secondary, Small, ThemePair };
