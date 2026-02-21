"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./retroui";

const CopyableCommand = ({ command }: { command: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-2 group">
      <code className="flex-1">{command}</code>
      <Button
        size="sm"
        onClick={copyToClipboard}
        className="hidden md:block"
        title="Copy to clipboard"
      >
        {copied ? "Copied" : "Copy"}
      </Button>
      <Button
        className="md:hidden"
        size="icon"
        onClick={copyToClipboard}
        title="Copy to clipboard mobile"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export function CliCommand({
  npmCommand,
  yarnCommand,
  pnpmCommand,
  bunCommand,
}: {
  npmCommand: string;
  yarnCommand?: string;
  pnpmCommand?: string;
  bunCommand?: string;
}) {
  const isNpx = npmCommand.includes("npx");
  if (isNpx) {
    pnpmCommand = pnpmCommand ?? npmCommand.replace("npx", "pnpm dlx");
    yarnCommand = yarnCommand ?? npmCommand.replace("npx", "yarn dlx");
    bunCommand = bunCommand ?? npmCommand.replace("npx", "bunx");
  } else {
    pnpmCommand = pnpmCommand ?? npmCommand.replace("npm", "pnpm");
    yarnCommand = yarnCommand ?? npmCommand.replace("npm install", "yarn add");
    bunCommand = bunCommand ?? npmCommand.replace("npm", "bun");
  }

  return (
    <TabGroup className="p-4 my-2 bg-secondary rounded-(--radius) text-secondary-foreground/90">
      <TabList className="flex space-x-4 mb-6 text-sm">
        <Tab className="cursor-pointer text-muted-foreground relative px-2 py-1 bg-transparent data-selected:border-b-2 border-accent data-selected:text-secondary-foreground focus:outline-hidden">
          pnpm
        </Tab>
        <Tab className="cursor-pointer text-muted-foreground relative px-2 py-1 bg-transparent data-selected:border-b-2 border-accent data-selected:text-secondary-foreground focus:outline-hidden">
          npm
        </Tab>
        <Tab className="cursor-pointer text-muted-foreground relative px-2 py-1 bg-transparent data-selected:border-b-2 border-accent data-selected:text-secondary-foreground focus:outline-hidden">
          yarn
        </Tab>
        <Tab className="cursor-pointer text-muted-foreground relative px-2 py-1 bg-transparent data-selected:border-b-2 border-accent data-selected:text-secondary-foreground focus:outline-hidden">
          bun
        </Tab>
      </TabList>
      <TabPanels className="text-sm text-accent-foreground">
        <TabPanel>
          <CopyableCommand command={pnpmCommand} />
        </TabPanel>
        <TabPanel>
          <CopyableCommand command={npmCommand} />
        </TabPanel>
        <TabPanel>
          <CopyableCommand command={yarnCommand} />
        </TabPanel>
        <TabPanel>
          <CopyableCommand command={bunCommand} />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
}
