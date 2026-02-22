/**
 * Plugin package.json manifest types and validation.
 *
 * Defines the PluginPackageJson interface representing a plugin's package.json
 * with an `opentabs` field for plugin metadata. The parsePluginPackageJson
 * function validates a raw JSON object and returns a typed Result.
 */

import { err, ok } from './result.js';
import type { Result } from './result.js';

/** Plugin-specific metadata in the `opentabs` field of package.json */
interface PluginOpentabsField {
  readonly displayName: string;
  readonly description: string;
  readonly urlPatterns: string[];
}

/** A plugin's package.json with the required `opentabs` field */
interface PluginPackageJson {
  readonly name: string;
  readonly version: string;
  readonly main: string;
  readonly opentabs: PluginOpentabsField;
}

/**
 * Validate a plugin name: must start with 'opentabs-plugin-' or be a scoped
 * package (e.g., @org/opentabs-plugin-foo).
 */
const isValidPluginPackageName = (name: string): boolean => {
  if (name.startsWith('opentabs-plugin-')) return true;
  if (name.startsWith('@')) {
    const parts = name.split('/');
    if (parts.length === 2 && (parts[1] ?? '').startsWith('opentabs-plugin-')) return true;
  }
  return false;
};

/**
 * Parse and validate a raw JSON object as a PluginPackageJson.
 *
 * Checks that the object has a valid plugin package name, a version string,
 * a main entry point, and an opentabs field with the required metadata.
 * Returns a Result with the validated PluginPackageJson or a descriptive error.
 */
const parsePluginPackageJson = (json: unknown, sourcePath: string): Result<PluginPackageJson, string> => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return err(`Invalid package.json at ${sourcePath}: expected an object`);
  }

  const obj = json as Record<string, unknown>;

  // Validate name
  const name = obj.name;
  if (typeof name !== 'string' || name.length === 0) {
    return err(`Invalid package.json at ${sourcePath}: "name" must be a non-empty string`);
  }
  if (!isValidPluginPackageName(name)) {
    return err(
      `Invalid plugin package name "${name}" at ${sourcePath}: must start with "opentabs-plugin-" or be a scoped package like "@org/opentabs-plugin-foo"`,
    );
  }

  // Validate version
  const version = obj.version;
  if (typeof version !== 'string' || version.length === 0) {
    return err(`Invalid package.json at ${sourcePath}: "version" must be a non-empty string`);
  }

  // Validate main
  const main = obj.main;
  if (typeof main !== 'string' || main.length === 0) {
    return err(`Invalid package.json at ${sourcePath}: "main" must be a non-empty string`);
  }

  // Validate opentabs field
  const opentabs = obj.opentabs;
  if (typeof opentabs !== 'object' || opentabs === null || Array.isArray(opentabs)) {
    return err(`Invalid package.json at ${sourcePath}: "opentabs" field is required and must be an object`);
  }

  const ot = opentabs as Record<string, unknown>;

  const displayName = ot.displayName;
  if (typeof displayName !== 'string' || displayName.length === 0) {
    return err(`Invalid package.json at ${sourcePath}: "opentabs.displayName" must be a non-empty string`);
  }

  const description = ot.description;
  if (typeof description !== 'string' || description.length === 0) {
    return err(`Invalid package.json at ${sourcePath}: "opentabs.description" must be a non-empty string`);
  }

  const urlPatterns = ot.urlPatterns;
  if (!Array.isArray(urlPatterns) || urlPatterns.length === 0) {
    return err(`Invalid package.json at ${sourcePath}: "opentabs.urlPatterns" must be a non-empty array of strings`);
  }
  for (let i = 0; i < urlPatterns.length; i++) {
    if (typeof urlPatterns[i] !== 'string') {
      return err(`Invalid package.json at ${sourcePath}: "opentabs.urlPatterns[${i}]" must be a string`);
    }
  }

  return ok({
    name,
    version,
    main,
    opentabs: {
      displayName,
      description,
      urlPatterns: urlPatterns as string[],
    },
  });
};

export { parsePluginPackageJson };
export type { PluginOpentabsField, PluginPackageJson };
