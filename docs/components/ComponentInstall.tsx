'use client';

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { Check, ClipboardCopy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from './retroui';

/**
 * Tokenizes a shell command string into spans matching the Dracula-soft Shiki
 * theme colors used by rehype-pretty-code for fenced ```bash blocks.
 *
 * Color mapping (from Dracula-soft):
 *   #62E884 — command name (first word)
 *   #E7EE98 — arguments / subcommands
 *   #BF9EEE — flags (tokens starting with -)
 */
const DRACULA_CMD = '#62E884';
const DRACULA_ARG = '#E7EE98';
const DRACULA_FLAG = '#BF9EEE';

const highlightCommand = (command: string): ReactNode[] => {
  const tokens = command.split(/(\s+)/);
  const nodes: ReactNode[] = [];
  let isFirstWord = true;

  for (const [i, token] of tokens.entries()) {
    if (/^\s+$/.test(token)) {
      nodes.push(
        <span key={i} style={{ color: DRACULA_ARG }}>
          {token}
        </span>,
      );
      continue;
    }
    if (isFirstWord) {
      nodes.push(
        <span key={i} style={{ color: DRACULA_CMD }}>
          {token}
        </span>,
      );
      isFirstWord = false;
    } else if (token.startsWith('-')) {
      nodes.push(
        <span key={i} style={{ color: DRACULA_FLAG }}>
          {token}
        </span>,
      );
    } else {
      nodes.push(
        <span key={i} style={{ color: DRACULA_ARG }}>
          {token}
        </span>,
      );
    }
  }
  return nodes;
};

export const CliCommand = ({
  npmCommand,
  yarnCommand,
  pnpmCommand,
}: {
  npmCommand: string;
  yarnCommand?: string;
  pnpmCommand?: string;
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const isNpx = npmCommand.includes('npx');
  const resolvedPnpm =
    pnpmCommand ?? (isNpx ? npmCommand.replace('npx', 'pnpm dlx') : npmCommand.replace('npm', 'pnpm'));
  const resolvedYarn =
    yarnCommand ?? (isNpx ? npmCommand.replace('npx', 'yarn dlx') : npmCommand.replace('npm install', 'yarn add'));

  const commands = [npmCommand, resolvedPnpm, resolvedYarn];

  const handleCopy = () => {
    const command = commands[selectedIndex];
    if (!command) return;
    navigator.clipboard.writeText(command).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2">
      <TabGroup className="rounded-(--radius) bg-code-bg" selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <div className="flex items-center justify-between px-4 py-2 md:border-white/10 md:border-b">
          <TabList className="flex space-x-4 text-sm">
            <Tab className="relative cursor-pointer border-[#62E884] bg-transparent px-2 py-1 text-[#6272A4] focus:outline-hidden data-selected:border-b-2 data-selected:text-code-fg">
              npm
            </Tab>
            <Tab className="relative cursor-pointer border-[#62E884] bg-transparent px-2 py-1 text-[#6272A4] focus:outline-hidden data-selected:border-b-2 data-selected:text-code-fg">
              pnpm
            </Tab>
            <Tab className="relative cursor-pointer border-[#62E884] bg-transparent px-2 py-1 text-[#6272A4] focus:outline-hidden data-selected:border-b-2 data-selected:text-code-fg">
              yarn
            </Tab>
          </TabList>
          <Button disabled={copied} size="sm" onClick={handleCopy} className="hidden md:flex">
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <TabPanels className="p-4 text-code-fg text-sm">
          <TabPanel>
            <code className="font-mono">{highlightCommand(npmCommand)}</code>
          </TabPanel>
          <TabPanel>
            <code className="font-mono">{highlightCommand(resolvedPnpm)}</code>
          </TabPanel>
          <TabPanel>
            <code className="font-mono">{highlightCommand(resolvedYarn)}</code>
          </TabPanel>
        </TabPanels>
      </TabGroup>
      <Button disabled={copied} size="icon" onClick={handleCopy} className="absolute top-3 right-3 md:hidden">
        {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
      </Button>
    </div>
  );
};
