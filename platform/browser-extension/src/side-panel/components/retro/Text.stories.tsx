import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'Retro/Text',
  component: Text,
  argTypes: { as: { control: 'select', options: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'li'] } },
};

type Story = StoryObj<typeof Text>;

const Paragraph: Story = { args: { as: 'p', children: 'Body text in Space Grotesk.' } };
const Heading1: Story = { args: { as: 'h1', children: 'Heading 1' } };
const Anchor: Story = { args: { as: 'a', children: 'A link with hover underline.' } };
const ListItem: Story = {
  render: () => (
    <ul>
      <Text as="li">First list item</Text>
      <Text as="li">Second list item</Text>
    </ul>
  ),
};

const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Text as="h1">h1</Text>
      <Text as="h2">h2</Text>
      <Text as="h3">h3</Text>
      <Text as="h4">h4</Text>
      <Text as="h5">h5</Text>
      <Text as="h6">h6</Text>
      <Text as="p">paragraph</Text>
      <Text as="a">anchor</Text>
      <ul>
        <Text as="li">list item</Text>
      </ul>
    </div>
  ),
};

export default meta;
export { AllVariants, Anchor, Heading1, ListItem, Paragraph };
