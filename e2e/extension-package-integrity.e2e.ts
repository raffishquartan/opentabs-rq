/**
 * Extension package integrity E2E test.
 *
 * Verifies that the browser-extension npm package includes the .extension-hash
 * file and that its content matches the hash embedded in the side panel bundle.
 * This catches packaging bugs where critical files are missing from the npm
 * package's files field — the exact bug that caused the v0.0.88
 * ExtensionUpdateDialog infinite reload loop.
 *
 * This test does NOT need the full E2E infrastructure (no MCP server, no Chrome,
 * no extension context). It uses npm pack + tar extraction.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from './fixtures.js';

const BROWSER_EXT_DIR = path.resolve(import.meta.dirname, '..', 'platform', 'browser-extension');

test.describe('Extension package integrity', () => {
  test('.extension-hash is included in npm package and matches embedded hash', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-pkg-integrity-'));

    try {
      // Pack the browser-extension package
      const tarball = execSync('npm pack --pack-destination ' + tmpDir, {
        cwd: BROWSER_EXT_DIR,
        encoding: 'utf-8',
        timeout: 30_000,
      }).trim();

      // Extract the tarball
      const tarballPath = path.join(tmpDir, tarball);
      execSync(`tar xzf "${tarballPath}" -C "${tmpDir}"`, { timeout: 10_000 });

      const packageDir = path.join(tmpDir, 'package');

      // 1. .extension-hash file must exist
      const hashFilePath = path.join(packageDir, '.extension-hash');
      expect(fs.existsSync(hashFilePath)).toBe(true);
      const hashFromFile = fs.readFileSync(hashFilePath, 'utf-8').trim();
      expect(hashFromFile).toMatch(/^[0-9a-f]{16}$/);

      // 2. side-panel.js must have the hash embedded
      const sidePanelPath = path.join(packageDir, 'dist', 'side-panel', 'side-panel.js');
      expect(fs.existsSync(sidePanelPath)).toBe(true);
      const sidePanelContent = fs.readFileSync(sidePanelPath, 'utf-8');
      const firstLine = sidePanelContent.split('\n')[0] ?? '';
      const match = firstLine.match(/window\.__EXTENSION_HASH__="([0-9a-f]+)"/);
      expect(match).not.toBeNull();
      const hashFromBundle = match?.[1];

      // 3. Hashes must match
      expect(hashFromFile).toBe(hashFromBundle);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
