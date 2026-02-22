import { sanitizeToolOutput } from './sanitize-tool-output.js';
import { describe, expect, test } from 'bun:test';

describe('sanitizeToolOutput', () => {
  test('sanitizes Unix absolute paths in strings', () => {
    expect(sanitizeToolOutput('/home/user/.opentabs/config.json')).toBe('[PATH]');
  });

  test('sanitizes Windows absolute paths in strings', () => {
    expect(sanitizeToolOutput('C:\\Users\\admin\\Desktop\\file.txt')).toBe('[PATH]');
  });

  test('sanitizes HTTP URLs in strings', () => {
    // The Unix path regex runs before the URL regex (same order as sanitizeErrorMessage),
    // so the path portion of the URL is replaced first, then the URL regex matches the remainder.
    expect(sanitizeToolOutput('fetched from https://api.example.com/v1/data')).toBe('fetched from http[PATH]');
  });

  test('sanitizes localhost with port', () => {
    expect(sanitizeToolOutput('running on localhost:9515')).toBe('running on [LOCALHOST]');
  });

  test('sanitizes IPv4 addresses', () => {
    expect(sanitizeToolOutput('connected to 192.168.1.100')).toBe('connected to [IP]');
  });

  test('sanitizes multiple patterns in a single string', () => {
    const input = 'loaded /home/user/plugin from localhost:9515 at 192.168.1.1';
    const expected = 'loaded [PATH] from [LOCALHOST] at [IP]';
    expect(sanitizeToolOutput(input)).toBe(expected);
  });

  test('recursively sanitizes string values in objects', () => {
    const input = {
      path: '/home/user/.opentabs/config.json',
      count: 42,
      active: true,
      nested: {
        url: 'https://example.com/api',
        ip: '10.0.0.1',
      },
    };
    const result = sanitizeToolOutput(input) as Record<string, unknown>;
    expect(result.path).toBe('[PATH]');
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    const nested = result.nested as Record<string, unknown>;
    // URL regex matches after path regex has already replaced the path portion
    expect(nested.url).toBe('http[PATH]');
    expect(nested.ip).toBe('[IP]');
  });

  test('recursively sanitizes string values in arrays', () => {
    const input = ['/home/user/file', 42, 'localhost:3000', null];
    const result = sanitizeToolOutput(input) as unknown[];
    expect(result[0]).toBe('[PATH]');
    expect(result[1]).toBe(42);
    expect(result[2]).toBe('[LOCALHOST]');
    expect(result[3]).toBeNull();
  });

  test('does not modify object keys', () => {
    const input = { '/home/user/key': 'value', normalKey: '/home/user/value' };
    const result = sanitizeToolOutput(input) as Record<string, unknown>;
    expect(result).toHaveProperty('/home/user/key');
    expect(result['/home/user/key']).toBe('value');
    expect(result.normalKey).toBe('[PATH]');
  });

  test('returns non-object primitives unchanged', () => {
    expect(sanitizeToolOutput(42)).toBe(42);
    expect(sanitizeToolOutput(true)).toBe(true);
    expect(sanitizeToolOutput(null)).toBeNull();
    expect(sanitizeToolOutput(undefined)).toBeUndefined();
  });

  test('does not truncate long strings (unlike sanitizeErrorMessage)', () => {
    const longPath = '/home/user/' + 'x'.repeat(600);
    const result = sanitizeToolOutput(longPath) as string;
    // The path gets replaced with [PATH], but remaining chars should stay
    expect(result).not.toContain('...');
  });

  test('handles deeply nested objects up to max depth', () => {
    // Build a 60-level deep object (exceeds MAX_DEPTH of 50)
    let obj: unknown = 'secret at /home/user/deep';
    for (let i = 0; i < 60; i++) {
      obj = { child: obj };
    }
    const result = sanitizeToolOutput(obj);
    // At depth > 50, the string should be returned as-is (not sanitized)
    let current = result as Record<string, unknown>;
    for (let i = 0; i < 50; i++) {
      current = current.child as Record<string, unknown>;
    }
    // Beyond depth 50, the remaining nested structure is returned unchanged
    expect(typeof current.child).toBe('object');
  });
});
