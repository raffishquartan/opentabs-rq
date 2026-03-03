import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { parsePort, resetConfigPortCache, resolvePort } from './parse-port.js';

// ---------------------------------------------------------------------------
// parsePort
// ---------------------------------------------------------------------------

describe('parsePort', () => {
  test('parses valid integer port', () => {
    expect(parsePort('3000')).toBe(3000);
    expect(parsePort('1')).toBe(1);
    expect(parsePort('65535')).toBe(65535);
    expect(parsePort('9515')).toBe(9515);
  });

  test('rejects port 0', () => {
    expect(() => parsePort('0')).toThrow('Must be an integer between 1 and 65535.');
  });

  test('rejects port above 65535', () => {
    expect(() => parsePort('65536')).toThrow('Must be an integer between 1 and 65535.');
    expect(() => parsePort('99999')).toThrow('Must be an integer between 1 and 65535.');
  });

  test('rejects negative port', () => {
    expect(() => parsePort('-1')).toThrow('Must be an integer between 1 and 65535.');
  });

  test('rejects NaN', () => {
    expect(() => parsePort('abc')).toThrow('Must be an integer between 1 and 65535.');
    expect(() => parsePort('')).toThrow('Must be an integer between 1 and 65535.');
  });

  test('rejects float values', () => {
    expect(() => parsePort('3000.5')).toThrow('Must be an integer between 1 and 65535.');
    expect(() => parsePort('1.1')).toThrow('Must be an integer between 1 and 65535.');
  });

  test('rejects Infinity', () => {
    expect(() => parsePort('Infinity')).toThrow('Must be an integer between 1 and 65535.');
  });
});

// ---------------------------------------------------------------------------
// resolvePort
// ---------------------------------------------------------------------------

describe('resolvePort', () => {
  const originalEnv = process.env.OPENTABS_PORT;
  const originalConfigDir = process.env.OPENTABS_CONFIG_DIR;
  let tmpDir: string;

  beforeAll(() => {
    delete process.env.OPENTABS_PORT;
    // Point config dir to an empty temp dir so real ~/.opentabs/config.json doesn't interfere
    tmpDir = mkdtempSync(join(tmpdir(), 'opentabs-parse-port-test-'));
    process.env.OPENTABS_CONFIG_DIR = tmpDir;
  });

  beforeEach(() => {
    resetConfigPortCache();
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.OPENTABS_PORT = originalEnv;
    } else {
      delete process.env.OPENTABS_PORT;
    }
    if (originalConfigDir !== undefined) {
      process.env.OPENTABS_CONFIG_DIR = originalConfigDir;
    } else {
      delete process.env.OPENTABS_CONFIG_DIR;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns options.port when provided', () => {
    expect(resolvePort({ port: 4000 })).toBe(4000);
  });

  test('returns OPENTABS_PORT env var when options.port is undefined', () => {
    process.env.OPENTABS_PORT = '5000';
    expect(resolvePort({})).toBe(5000);
    delete process.env.OPENTABS_PORT;
  });

  test('returns default 9515 when neither option nor env is set', () => {
    delete process.env.OPENTABS_PORT;
    expect(resolvePort({})).toBe(9515);
  });

  test('options.port takes priority over env var', () => {
    process.env.OPENTABS_PORT = '5000';
    expect(resolvePort({ port: 3000 })).toBe(3000);
    delete process.env.OPENTABS_PORT;
  });

  test('ignores invalid OPENTABS_PORT env var and falls back to default', () => {
    process.env.OPENTABS_PORT = 'not-a-number';
    expect(resolvePort({})).toBe(9515);
    delete process.env.OPENTABS_PORT;
  });

  test('ignores OPENTABS_PORT of 0', () => {
    process.env.OPENTABS_PORT = '0';
    expect(resolvePort({})).toBe(9515);
    delete process.env.OPENTABS_PORT;
  });

  test('ignores OPENTABS_PORT above 65535', () => {
    process.env.OPENTABS_PORT = '70000';
    expect(resolvePort({})).toBe(9515);
    delete process.env.OPENTABS_PORT;
  });

  test('ignores float OPENTABS_PORT', () => {
    process.env.OPENTABS_PORT = '3000.5';
    expect(resolvePort({})).toBe(9515);
    delete process.env.OPENTABS_PORT;
  });
});

// ---------------------------------------------------------------------------
// resolvePort — config.json integration
// ---------------------------------------------------------------------------

describe('resolvePort with config.json', () => {
  const originalEnv = process.env.OPENTABS_PORT;
  const originalConfigDir = process.env.OPENTABS_CONFIG_DIR;
  let tmpDir: string;
  let configPath: string;

  beforeAll(() => {
    delete process.env.OPENTABS_PORT;
    tmpDir = mkdtempSync(join(tmpdir(), 'opentabs-config-port-test-'));
    configPath = join(tmpDir, 'config.json');
    process.env.OPENTABS_CONFIG_DIR = tmpDir;
  });

  beforeEach(() => {
    resetConfigPortCache();
    // Clean up config file before each test
    rmSync(configPath, { force: true });
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.OPENTABS_PORT = originalEnv;
    } else {
      delete process.env.OPENTABS_PORT;
    }
    if (originalConfigDir !== undefined) {
      process.env.OPENTABS_CONFIG_DIR = originalConfigDir;
    } else {
      delete process.env.OPENTABS_CONFIG_DIR;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('reads port from config.json when no flag or env var is set', () => {
    writeFileSync(configPath, JSON.stringify({ port: 8888 }));
    expect(resolvePort({})).toBe(8888);
  });

  test('--port flag overrides config.json port', () => {
    writeFileSync(configPath, JSON.stringify({ port: 8888 }));
    expect(resolvePort({ port: 3000 })).toBe(3000);
  });

  test('OPENTABS_PORT env var overrides config.json port', () => {
    writeFileSync(configPath, JSON.stringify({ port: 8888 }));
    process.env.OPENTABS_PORT = '5000';
    expect(resolvePort({})).toBe(5000);
    delete process.env.OPENTABS_PORT;
  });

  test('falls back to default when config.json is missing', () => {
    // configPath does not exist (cleaned up in beforeEach)
    expect(resolvePort({})).toBe(9515);
  });

  test('falls back to default when config.json has no port field', () => {
    writeFileSync(configPath, JSON.stringify({ localPlugins: [] }));
    expect(resolvePort({})).toBe(9515);
  });

  test('falls back to default when config.json port is not a number', () => {
    writeFileSync(configPath, JSON.stringify({ port: 'abc' }));
    expect(resolvePort({})).toBe(9515);
  });

  test('falls back to default when config.json port is out of range', () => {
    writeFileSync(configPath, JSON.stringify({ port: 0 }));
    expect(resolvePort({})).toBe(9515);
  });

  test('falls back to default when config.json port exceeds 65535', () => {
    writeFileSync(configPath, JSON.stringify({ port: 70000 }));
    expect(resolvePort({})).toBe(9515);
  });

  test('falls back to default when config.json port is a float', () => {
    writeFileSync(configPath, JSON.stringify({ port: 3000.5 }));
    expect(resolvePort({})).toBe(9515);
  });

  test('falls back to default when config.json contains invalid JSON', () => {
    writeFileSync(configPath, '{ not valid json }');
    expect(resolvePort({})).toBe(9515);
  });

  test('falls back to default when config.json is an array', () => {
    writeFileSync(configPath, JSON.stringify([{ port: 8888 }]));
    expect(resolvePort({})).toBe(9515);
  });
});
