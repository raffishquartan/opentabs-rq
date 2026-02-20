import { INavigationConfig } from "@/types";

export const navConfig: INavigationConfig = {
  topNavItems: [
    { title: "Docs", href: "/docs" },
    { title: "Plugins", href: "/docs/plugins/slack" },
  ],
  sideNavItems: [
    {
      title: "Getting Started",
      children: [
        { title: "Introduction", href: "/docs" },
        { title: "Installation", href: "/docs/install" },
      ],
    },
    {
      title: "Concepts",
      children: [
        { title: "Architecture", href: "/docs/concepts/architecture" },
        { title: "Plugin System", href: "/docs/concepts/plugin-system" },
        {
          title: "Tab State Machine",
          href: "/docs/concepts/tab-state-machine",
        },
        { title: "Browser Tools", href: "/docs/concepts/browser-tools" },
      ],
    },
    {
      title: "Plugins",
      children: [
        { title: "Plugin SDK", href: "/docs/plugins/plugin-sdk" },
        {
          title: "Creating a Plugin",
          href: "/docs/plugins/creating-a-plugin",
        },
        { title: "Slack", href: "/docs/plugins/slack" },
      ],
    },
    {
      title: "Reference",
      children: [
        { title: "Configuration", href: "/docs/reference/configuration" },
        { title: "CLI Commands", href: "/docs/reference/cli" },
        { title: "MCP Server", href: "/docs/reference/mcp-server" },
        { title: "Troubleshooting", href: "/docs/reference/troubleshooting" },
      ],
    },
  ],
};
