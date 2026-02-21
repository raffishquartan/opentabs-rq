import Footer from '@/components/footer';
import { Button, Text } from '@/components/retroui';
import { SiGithub } from '@icons-pack/react-simple-icons';
import Link from 'next/link';

const steps = [
  {
    step: 1,
    title: 'Your AI agent sends a tool call',
    description:
      'Claude, Cursor, or any MCP-compatible agent calls a tool like slack_send_message or jira_create_issue — just like calling an API.',
  },
  {
    step: 2,
    title: 'OpenTabs routes it to your browser',
    description:
      'The MCP server dispatches the call to the Chrome extension, which injects it into the correct tab — using your existing authenticated session.',
  },
  {
    step: 3,
    title: 'The action runs on the real web app',
    description:
      'The plugin adapter executes the action directly in the page context, with full access to the DOM and same-origin APIs. Results flow back to the agent.',
  },
];

const ArchitectureIllustration = () => (
  <svg viewBox="0 0 880 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden="true">
    <defs>
      <marker id="arrow-right" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8 Z" fill="var(--color-foreground)" />
      </marker>
      <marker id="arrow-left" markerWidth="10" markerHeight="10" refX="2" refY="4" orient="auto">
        <path d="M10,0 L0,4 L10,8 Z" fill="var(--color-foreground)" />
      </marker>
    </defs>

    {/* ── Box 1: AI Agent ──────────────────────────────── */}
    {/* Shadow */}
    <rect x="8" y="48" width="200" height="240" fill="var(--color-foreground)" />
    {/* Body */}
    <rect
      x="4"
      y="44"
      width="200"
      height="240"
      fill="var(--color-background)"
      stroke="var(--color-foreground)"
      strokeWidth="3"
    />
    {/* Header */}
    <rect x="4" y="44" width="200" height="40" fill="var(--color-foreground)" />
    <text
      x="104"
      y="70"
      fontSize="13"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary)"
      fontWeight="bold"
      textAnchor="middle">
      AI Agent
    </text>

    {/* Terminal-style content */}
    <text
      x="20"
      y="112"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.5">
      {'>'} thinking...
    </text>
    <text
      x="20"
      y="132"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.5">
      {'>'} calling tool
    </text>

    {/* Tool call chip */}
    <rect x="16" y="152" width="176" height="30" fill="var(--color-foreground)" />
    <text
      x="104"
      y="172"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary)"
      textAnchor="middle">
      slack_send_message()
    </text>

    {/* Result chip */}
    <rect
      x="16"
      y="196"
      width="176"
      height="30"
      fill="var(--color-background)"
      stroke="var(--color-foreground)"
      strokeWidth="2"
    />
    <text
      x="104"
      y="216"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.7"
      textAnchor="middle">
      result: message sent
    </text>

    {/* Agent labels */}
    <rect
      x="16"
      y="244"
      width="56"
      height="20"
      fill="var(--color-primary)"
      stroke="var(--color-foreground)"
      strokeWidth="1.5"
    />
    <text
      x="44"
      y="258"
      fontSize="8"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary-foreground)"
      fontWeight="bold"
      textAnchor="middle">
      Claude
    </text>
    <rect
      x="80"
      y="244"
      width="56"
      height="20"
      fill="var(--color-background)"
      stroke="var(--color-foreground)"
      strokeWidth="1.5"
    />
    <text
      x="108"
      y="258"
      fontSize="8"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      textAnchor="middle">
      Cursor
    </text>
    <rect
      x="144"
      y="244"
      width="44"
      height="20"
      fill="var(--color-background)"
      stroke="var(--color-foreground)"
      strokeWidth="1.5"
    />
    <text
      x="166"
      y="258"
      fontSize="8"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      textAnchor="middle">
      any
    </text>

    {/* ── Arrow 1: Agent -> MCP Server ─────────────────── */}
    <line
      x1="214"
      y1="148"
      x2="320"
      y2="148"
      stroke="var(--color-foreground)"
      strokeWidth="2"
      markerEnd="url(#arrow-right)"
    />
    <line
      x1="214"
      y1="168"
      x2="320"
      y2="168"
      stroke="var(--color-foreground)"
      strokeWidth="2"
      strokeDasharray="6 4"
      markerEnd="url(#arrow-left)"
    />
    <text
      x="267"
      y="140"
      fontSize="9"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.6"
      textAnchor="middle">
      MCP
    </text>

    {/* ── Box 2: MCP Server ────────────────────────────── */}
    {/* Shadow */}
    <rect x="336" y="48" width="200" height="240" fill="var(--color-foreground)" />
    {/* Body */}
    <rect
      x="332"
      y="44"
      width="200"
      height="240"
      fill="var(--color-primary)"
      stroke="var(--color-foreground)"
      strokeWidth="3"
    />
    {/* Header */}
    <rect x="332" y="44" width="200" height="40" fill="var(--color-foreground)" />
    <text
      x="432"
      y="70"
      fontSize="13"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary)"
      fontWeight="bold"
      textAnchor="middle">
      OpenTabs Server
    </text>

    {/* Server internals */}
    <rect
      x="348"
      y="100"
      width="168"
      height="28"
      fill="var(--color-foreground)"
      opacity="0.15"
      stroke="var(--color-foreground)"
      strokeWidth="1.5"
    />
    <text
      x="432"
      y="119"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      textAnchor="middle">
      Plugin Discovery
    </text>

    <rect
      x="348"
      y="138"
      width="168"
      height="28"
      fill="var(--color-foreground)"
      opacity="0.15"
      stroke="var(--color-foreground)"
      strokeWidth="1.5"
    />
    <text
      x="432"
      y="157"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      textAnchor="middle">
      Tool Registry
    </text>

    <rect
      x="348"
      y="176"
      width="168"
      height="28"
      fill="var(--color-foreground)"
      opacity="0.15"
      stroke="var(--color-foreground)"
      strokeWidth="1.5"
    />
    <text
      x="432"
      y="195"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      textAnchor="middle">
      Tool Dispatch
    </text>

    {/* localhost label */}
    <text
      x="432"
      y="240"
      fontSize="9"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.5"
      textAnchor="middle">
      localhost:9515
    </text>

    {/* ── Arrow 2: MCP Server -> Extension ─────────────── */}
    <line
      x1="542"
      y1="148"
      x2="648"
      y2="148"
      stroke="var(--color-foreground)"
      strokeWidth="2"
      markerEnd="url(#arrow-right)"
    />
    <line
      x1="542"
      y1="168"
      x2="648"
      y2="168"
      stroke="var(--color-foreground)"
      strokeWidth="2"
      strokeDasharray="6 4"
      markerEnd="url(#arrow-left)"
    />
    <text
      x="595"
      y="140"
      fontSize="9"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.6"
      textAnchor="middle">
      WebSocket
    </text>

    {/* ── Box 3: Browser / Extension ───────────────────── */}
    {/* Shadow */}
    <rect x="664" y="48" width="212" height="240" fill="var(--color-foreground)" />
    {/* Body */}
    <rect
      x="660"
      y="44"
      width="212"
      height="240"
      fill="var(--color-background)"
      stroke="var(--color-foreground)"
      strokeWidth="3"
    />
    {/* Browser chrome */}
    <rect x="660" y="44" width="212" height="40" fill="var(--color-foreground)" />
    {/* Traffic lights */}
    <circle cx="680" cy="64" r="5" fill="var(--color-primary)" />
    <circle cx="696" cy="64" r="5" fill="var(--color-background)" opacity="0.4" />
    <circle cx="712" cy="64" r="5" fill="var(--color-background)" opacity="0.4" />
    <text
      x="780"
      y="69"
      fontSize="11"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary)"
      opacity="0.8"
      textAnchor="middle">
      Your Browser
    </text>

    {/* Tab rows representing different web apps */}
    <rect
      x="676"
      y="100"
      width="180"
      height="32"
      fill="var(--color-primary)"
      stroke="var(--color-foreground)"
      strokeWidth="2"
    />
    <text
      x="692"
      y="121"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary-foreground)"
      fontWeight="bold">
      Slack
    </text>
    <rect x="780" y="108" width="64" height="16" fill="var(--color-foreground)" />
    <text
      x="812"
      y="120"
      fontSize="7"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary)"
      textAnchor="middle">
      adapter.js
    </text>

    <rect
      x="676"
      y="140"
      width="180"
      height="32"
      fill="var(--color-background)"
      stroke="var(--color-foreground)"
      strokeWidth="2"
    />
    <text x="692" y="161" fontSize="10" fontFamily="var(--font-mono), monospace" fill="var(--color-foreground)">
      Linear
    </text>
    <rect x="780" y="148" width="64" height="16" fill="var(--color-foreground)" />
    <text
      x="812"
      y="160"
      fontSize="7"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary)"
      textAnchor="middle">
      adapter.js
    </text>

    <rect
      x="676"
      y="180"
      width="180"
      height="32"
      fill="var(--color-background)"
      stroke="var(--color-foreground)"
      strokeWidth="2"
    />
    <text x="692" y="201" fontSize="10" fontFamily="var(--font-mono), monospace" fill="var(--color-foreground)">
      GitHub
    </text>
    <rect x="780" y="188" width="64" height="16" fill="var(--color-foreground)" />
    <text
      x="812"
      y="200"
      fontSize="7"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-primary)"
      textAnchor="middle">
      adapter.js
    </text>

    <rect
      x="676"
      y="220"
      width="180"
      height="32"
      fill="var(--color-background)"
      stroke="var(--color-foreground)"
      strokeWidth="1.5"
      strokeDasharray="4 3"
    />
    <text
      x="766"
      y="241"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.4"
      textAnchor="middle">
      any web app...
    </text>

    {/* ── Bottom label bar ─────────────────────────────── */}
    <text
      x="104"
      y="310"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.4"
      textAnchor="middle">
      Any MCP client
    </text>
    <text
      x="432"
      y="310"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.4"
      textAnchor="middle">
      Discovers plugins, routes calls
    </text>
    <text
      x="766"
      y="310"
      fontSize="10"
      fontFamily="var(--font-mono), monospace"
      fill="var(--color-foreground)"
      opacity="0.4"
      textAnchor="middle">
      Your session, your tabs
    </text>
  </svg>
);

export default function Home() {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="container mx-auto max-w-6xl px-4 pt-14 pb-8 lg:px-0 lg:pt-20 lg:pb-10">
        <div className="mx-auto max-w-3xl text-center">
          <Text as="h1" className="text-foreground mb-6 text-5xl lg:text-6xl">
            AI agents for
            <br />
            any web app
          </Text>
          <p className="text-muted-foreground mx-auto mb-10 max-w-xl text-lg">
            Give AI agents access to any web application through your authenticated browser session. No API keys. No
            reverse engineering. Just your browser.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/docs/quick-start" passHref>
              <Button>Get Started</Button>
            </Link>
            <Link href="https://github.com/AnomalyCo/opentabs" target="_blank" passHref>
              <Button variant="outline">
                <SiGithub size={16} className="mr-2" />
                GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Architecture Illustration ─────────────────────── */}
      <section className="container mx-auto max-w-5xl px-4 pb-12 lg:px-0">
        <div className="relative">
          <div className="bg-foreground absolute inset-0 translate-x-3 translate-y-3" />
          <div className="border-foreground bg-background relative border-4 p-6 lg:p-8">
            <ArchitectureIllustration />
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="border-foreground container mx-auto max-w-6xl border-t-2 px-4 py-20 lg:px-0">
        <Text as="h2" className="mb-12 text-3xl">
          How it works
        </Text>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {steps.map(item => (
            <div key={item.step} className="flex gap-5">
              <span className="border-foreground bg-primary text-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 text-sm font-bold">
                {item.step}
              </span>
              <div>
                <p className="text-foreground mb-2 font-bold">{item.title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="container mx-auto my-24 max-w-6xl px-4 lg:px-0">
        <div className="border-foreground bg-primary flex flex-col items-center justify-between gap-8 border-4 px-8 py-14 lg:flex-row">
          <div>
            <Text as="h2" className="text-foreground mb-2">
              Build plugins for any website
            </Text>
            <p className="text-foreground/70">
              Open source. Plugin SDK included. Publish to npm and share with the community.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-4 sm:flex-row">
            <Link href="/docs/quick-start" passHref>
              <Button className="bg-background" variant="outline">
                Quick Start
              </Button>
            </Link>
            <Link href="https://github.com/AnomalyCo/opentabs" target="_blank" passHref>
              <Button className="bg-background" variant="outline">
                <SiGithub size={16} className="mr-2" />
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
