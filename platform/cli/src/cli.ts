#!/usr/bin/env bun

import {
  registerAuditCommand,
  registerConfigCommand,
  registerDoctorCommand,
  registerLogsCommand,
  registerPluginCommand,
  registerStartCommand,
  registerStatusCommand,
} from './commands/index.js';
import { parsePort } from './parse-port.js';
import { Command } from 'commander';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliDir = dirname(fileURLToPath(import.meta.url));
const pkgJson = JSON.parse(await Bun.file(join(cliDir, '..', 'package.json')).text()) as { version: string };

const program = new Command('opentabs')
  .version(pkgJson.version, '-V, --version')
  .description('OpenTabs — manage your MCP server and plugins')
  .option('--port <number>', 'MCP server port (env: OPENTABS_PORT, default: 9515)', parsePort)
  .action(() => {
    program.help();
  });

registerStartCommand(program);
registerStatusCommand(program);
registerAuditCommand(program);
registerDoctorCommand(program);
registerLogsCommand(program);
registerPluginCommand(program);
registerConfigCommand(program);

await program.parseAsync();
