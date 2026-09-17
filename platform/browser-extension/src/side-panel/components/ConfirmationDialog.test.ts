import { describe, expect, test } from 'vitest';
import { buildSecurityReviewPrompt, isLongTextValue, resolveDisplayIndex, splitParams } from './ConfirmationDialog.js';

describe('resolveDisplayIndex', () => {
  test('returns the same index when removal makes the next item slide into that position', () => {
    // [A, B, C] with B at index 1 displayed — remove B → [A, C], count=2
    // Index 1 still valid: shows C (not A)
    expect(resolveDisplayIndex(1, 2)).toBe(1);
  });

  test('clamps to the last item when the removed item was at the end', () => {
    // [A, B] with B at index 1 displayed — remove B → [A], count=1
    // Index 1 out of bounds: clamps to 0 → shows A
    expect(resolveDisplayIndex(1, 1)).toBe(0);
  });

  test('returns 0 when viewing the first item', () => {
    expect(resolveDisplayIndex(0, 3)).toBe(0);
  });

  test('returns count - 1 when index exceeds the new length', () => {
    expect(resolveDisplayIndex(4, 3)).toBe(2);
  });

  test('handles a single-item list', () => {
    expect(resolveDisplayIndex(0, 1)).toBe(0);
  });
});

describe('isLongTextValue', () => {
  test('treats a multi-line string as long text regardless of length', () => {
    expect(isLongTextValue('a\nb')).toBe(true);
  });

  test('treats a single-line string over 100 characters as long text', () => {
    expect(isLongTextValue('a'.repeat(101))).toBe(true);
  });

  test('does not treat a short single-line string as long text', () => {
    expect(isLongTextValue('a'.repeat(100))).toBe(false);
  });

  test('does not treat non-string values as long text', () => {
    expect(isLongTextValue(12345)).toBe(false);
    expect(isLongTextValue({ code: 'x'.repeat(200) })).toBe(false);
  });
});

describe('splitParams', () => {
  test('separates long text values from the rest', () => {
    const result = splitParams({ tabId: 42, code: 'const x = 1;\nreturn x;' });
    expect(result.longText).toEqual([['code', 'const x = 1;\nreturn x;']]);
    expect(result.rest).toEqual({ tabId: 42 });
  });

  test('puts everything in rest when there is no long text value', () => {
    const result = splitParams({ channel: '#general', message: 'hi' });
    expect(result.longText).toEqual([]);
    expect(result.rest).toEqual({ channel: '#general', message: 'hi' });
  });
});

describe('buildSecurityReviewPrompt', () => {
  test('embeds a long text param as a fenced code block and short params as JSON', () => {
    const code = "const res = await fetch('https://example.com');\nreturn res.status;";
    const prompt = buildSecurityReviewPrompt({
      id: 'conf-1',
      tool: 'browser_execute_script',
      plugin: 'browser',
      params: { tabId: 42, code },
    });
    expect(prompt).toContain('Tool: browser_execute_script');
    expect(prompt).toContain('Plugin: browser');
    expect(prompt).toContain('"tabId": 42');
    expect(prompt).toContain(`code:\n\`\`\`\n${code}\n\`\`\``);
  });

  test('reports no parameters when params is empty', () => {
    const prompt = buildSecurityReviewPrompt({ id: 'conf-1', tool: 'screenshot', plugin: 'browser', params: {} });
    expect(prompt).toContain('(none)');
  });
});
