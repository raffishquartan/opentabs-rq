/**
 * `opentabs plugin` command — plugin management (create, search, install).
 */

import { getConfigPath, readConfig } from '../config.js';
import { resolvePort } from '../parse-port.js';
import { scaffoldPlugin, ScaffoldError } from '../scaffold.js';
import pc from 'picocolors';
import type { Command } from 'commander';

// --- npm registry types ---

interface NpmSearchPackage {
  name: string;
  description?: string;
  version: string;
  publisher?: { username: string };
}

interface NpmSearchResult {
  objects: Array<{ package: NpmSearchPackage }>;
}

// --- Helpers ---

/**
 * Normalize a shorthand plugin name to its full npm package name.
 * "slack" → "opentabs-plugin-slack", but scoped names and full names pass through.
 */
const normalizePluginName = (name: string): string => {
  if (name.startsWith('@') || name.startsWith('opentabs-plugin-')) return name;
  return `opentabs-plugin-${name}`;
};

/**
 * Notify the running MCP server to rediscover plugins via POST /reload.
 * Non-fatal — prints a hint on failure but never throws.
 */
const notifyServer = async (options: { port?: number }): Promise<void> => {
  const port = resolvePort(options);
  const configPath = getConfigPath();
  const config = await readConfig(configPath);
  const secret = config && typeof config.secret === 'string' ? config.secret : null;

  try {
    const healthRes = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!healthRes.ok) return;
  } catch {
    // Server not running — nothing to notify
    return;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['Authorization'] = `Bearer ${secret}`;

    const res = await fetch(`http://localhost:${port}/reload`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(5_000),
    });

    if (res.ok) {
      console.log(pc.dim('Server notified — plugins rediscovered.'));
    } else {
      console.log(pc.dim(`Could not notify server (HTTP ${res.status}). Restart the server to pick up changes.`));
    }
  } catch {
    console.log(pc.dim('Could not notify server. Restart the server to pick up changes.'));
  }
};

// --- Install handler ---

const handlePluginInstall = async (name: string, options: { port?: number }): Promise<void> => {
  const pkg = normalizePluginName(name);
  console.log(`Installing ${pc.bold(pkg)}...`);

  const proc = Bun.spawn(['npm', 'install', '-g', pkg], {
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.error(pc.red(`npm install failed (exit code ${exitCode}).`));
    process.exit(1);
  }

  console.log(pc.green(`Successfully installed ${pkg}.`));
  await notifyServer(options);
};

// --- Search handler ---

const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';

const handlePluginSearch = async (query?: string): Promise<void> => {
  const params = new URLSearchParams({
    text: query ? `keywords:opentabs-plugin ${query}` : 'keywords:opentabs-plugin',
    size: '20',
  });

  let data: NpmSearchResult;
  try {
    const response = await fetch(`${NPM_SEARCH_URL}?${params.toString()}`);

    if (response.status === 429) {
      console.error(pc.yellow('npm registry rate limit reached. Try again in a moment.'));
      process.exit(1);
    }
    if (!response.ok) {
      console.error(pc.red(`npm registry returned an error (HTTP ${response.status.toString()}). Try again later.`));
      process.exit(1);
    }

    data = (await response.json()) as NpmSearchResult;
  } catch {
    console.error(pc.red('Could not reach npm registry. Check your internet connection.'));
    process.exit(1);
  }

  if (data.objects.length === 0) {
    const term = query ?? '';
    console.log(pc.yellow(`No plugins found for '${term}'. Try a different search term.`));
    return;
  }

  console.log();
  for (const { package: pkg } of data.objects) {
    const label = pkg.name.startsWith('@opentabs-dev/') ? pc.blue('[official]') : pc.dim('[community]');
    const desc = pkg.description
      ? pkg.description.length > 60
        ? pkg.description.slice(0, 57) + '...'
        : pkg.description
      : '';
    const author = pkg.publisher?.username ?? 'unknown';

    console.log(`  ${label} ${pc.bold(pkg.name)} ${pc.dim(`v${pkg.version}`)} — ${desc} ${pc.dim(`by ${author}`)}`);
  }
  console.log();
  console.log(`Install a plugin: ${pc.cyan('opentabs plugin install <name>')}`);
  console.log();
};

// --- Command registration ---

const registerPluginCommand = (program: Command): void => {
  const pluginCmd = program
    .command('plugin')
    .description('Manage plugins')
    .action(() => {
      pluginCmd.help();
    });

  pluginCmd
    .command('search')
    .description('Search npm registry for opentabs plugins')
    .argument('[query]', 'Search term (optional — lists all plugins if omitted)')
    .addHelpText(
      'after',
      `
Examples:
  $ opentabs plugin search slack
  $ opentabs plugin search          # lists all available plugins`,
    )
    .action(async (query?: string) => {
      await handlePluginSearch(query);
    });

  pluginCmd
    .command('install')
    .description('Install a plugin from npm')
    .argument('<name>', 'Plugin name or full package name (e.g., slack or opentabs-plugin-slack)')
    .addHelpText(
      'after',
      `
Examples:
  $ opentabs plugin install slack
  $ opentabs plugin install opentabs-plugin-slack
  $ opentabs plugin install @my-org/opentabs-plugin-custom`,
    )
    .action((name: string, _options: unknown, command: Command) =>
      handlePluginInstall(name, command.optsWithGlobals()),
    );

  pluginCmd
    .command('create')
    .description('Scaffold a new plugin project')
    .argument('<name>', 'Plugin name (lowercase alphanumeric + hyphens)')
    .requiredOption('--domain <domain>', 'Target domain (e.g., .slack.com or github.com)')
    .option('--display <name>', 'Display name (e.g., Slack)')
    .option('--description <desc>', 'Plugin description')
    .addHelpText(
      'after',
      `
Examples:
  $ opentabs plugin create my-plugin --domain .example.com
  $ opentabs plugin create slack --domain .slack.com --display Slack`,
    )
    .action(async (name: string, options: { domain: string; display?: string; description?: string }) => {
      try {
        await scaffoldPlugin({
          name,
          domain: options.domain,
          display: options.display,
          description: options.description,
        });
      } catch (err: unknown) {
        if (err instanceof ScaffoldError) {
          console.error(pc.red(`Error: ${err.message}`));
          process.exit(1);
        }
        throw err;
      }
    });
};

export { registerPluginCommand };
