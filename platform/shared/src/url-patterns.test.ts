import { describe, expect, test } from 'vitest';
import { matchPattern, urlMatchesPatterns } from './url-patterns.js';

describe('matchPattern', () => {
  describe('scheme matching', () => {
    test('wildcard scheme matches http', () => {
      expect(matchPattern('http://example.com/path', '*://example.com/*')).toBe(true);
    });

    test('wildcard scheme matches https', () => {
      expect(matchPattern('https://example.com/path', '*://example.com/*')).toBe(true);
    });

    test('wildcard scheme rejects ftp', () => {
      expect(matchPattern('ftp://example.com/path', '*://example.com/*')).toBe(false);
    });

    test('explicit http scheme matches http', () => {
      expect(matchPattern('http://example.com/path', 'http://example.com/*')).toBe(true);
    });

    test('explicit http scheme rejects https', () => {
      expect(matchPattern('https://example.com/path', 'http://example.com/*')).toBe(false);
    });

    test('explicit https scheme matches https', () => {
      expect(matchPattern('https://example.com/path', 'https://example.com/*')).toBe(true);
    });
  });

  describe('host matching', () => {
    test('exact host match', () => {
      expect(matchPattern('https://example.com/path', '*://example.com/*')).toBe(true);
    });

    test('exact host mismatch', () => {
      expect(matchPattern('https://other.com/path', '*://example.com/*')).toBe(false);
    });

    test('wildcard host matches any domain', () => {
      expect(matchPattern('https://anything.example.com/path', '*://*/*')).toBe(true);
    });

    test('subdomain wildcard matches subdomain', () => {
      expect(matchPattern('https://app.slack.com/path', '*://*.slack.com/*')).toBe(true);
    });

    test('subdomain wildcard matches bare domain', () => {
      expect(matchPattern('https://slack.com/path', '*://*.slack.com/*')).toBe(true);
    });

    test('subdomain wildcard matches deep subdomain', () => {
      expect(matchPattern('https://a.b.slack.com/path', '*://*.slack.com/*')).toBe(true);
    });

    test('subdomain wildcard rejects unrelated domain', () => {
      expect(matchPattern('https://notslack.com/path', '*://*.slack.com/*')).toBe(false);
    });

    test('localhost matches', () => {
      expect(matchPattern('http://localhost/path', '*://localhost/*')).toBe(true);
    });
  });

  describe('port matching', () => {
    test('pattern with port matches same port', () => {
      expect(matchPattern('http://localhost:9516/path', '*://localhost:9516/*')).toBe(true);
    });

    test('pattern with port rejects different port', () => {
      expect(matchPattern('http://localhost:3000/path', '*://localhost:9516/*')).toBe(false);
    });

    test('pattern without port matches default port', () => {
      expect(matchPattern('https://example.com/path', '*://example.com/*')).toBe(true);
    });

    test('pattern without port matches URL with explicit port', () => {
      expect(matchPattern('https://example.com:8080/path', '*://example.com/*')).toBe(true);
    });

    test('localhost with explicit port matches', () => {
      expect(matchPattern('http://localhost:3000/', 'http://localhost:3000/*')).toBe(true);
    });

    test('default port in pattern does not match URL without explicit port', () => {
      // URL.port is '' for default ports (443 for https), so pattern port '443' !== ''
      expect(matchPattern('https://example.com/path', 'https://example.com:443/*')).toBe(false);
    });

    test('port-only difference between URLs is detected', () => {
      expect(matchPattern('http://localhost:9517/path', '*://localhost:9516/*')).toBe(false);
    });

    test('pattern without port matches localhost with any port', () => {
      expect(matchPattern('http://localhost:9516/path', '*://localhost/*')).toBe(true);
    });

    test('non-default explicit port in URL matches same port in pattern', () => {
      expect(matchPattern('https://example.com:8443/path', '*://example.com:8443/*')).toBe(true);
    });
  });

  describe('path matching', () => {
    test('wildcard path matches any path', () => {
      expect(matchPattern('https://example.com/any/path/here', '*://example.com/*')).toBe(true);
    });

    test('specific path matches exactly', () => {
      expect(matchPattern('https://example.com/api/v1', '*://example.com/api/v1')).toBe(true);
    });

    test('specific path rejects different path', () => {
      expect(matchPattern('https://example.com/api/v2', '*://example.com/api/v1')).toBe(false);
    });

    test('path with wildcard at end matches prefix', () => {
      expect(matchPattern('https://example.com/api/v1/users', '*://example.com/api/*')).toBe(true);
    });

    test('root path matches', () => {
      expect(matchPattern('https://example.com/', '*://example.com/*')).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('invalid URL returns false', () => {
      expect(matchPattern('not-a-url', '*://example.com/*')).toBe(false);
    });

    test('invalid pattern returns false', () => {
      expect(matchPattern('https://example.com/path', 'not-a-pattern')).toBe(false);
    });

    test('empty URL returns false', () => {
      expect(matchPattern('', '*://example.com/*')).toBe(false);
    });

    test('URL with regex-significant characters in path', () => {
      expect(matchPattern('https://example.com/foo.bar', '*://example.com/foo.bar')).toBe(true);
      // dot should be literal, not regex wildcard
      expect(matchPattern('https://example.com/fooXbar', '*://example.com/foo.bar')).toBe(false);
    });

    test('URL with query string (wildcard path)', () => {
      expect(matchPattern('https://example.com/path?key=value', '*://example.com/*')).toBe(true);
    });

    test('URL with query string (specific path)', () => {
      expect(matchPattern('https://example.com/path?foo=bar', '*://example.com/path')).toBe(true);
    });

    test('URL with query string does not pollute path matching', () => {
      expect(matchPattern('https://example.com/path?extra=/other', '*://example.com/path')).toBe(true);
    });

    test('URL with hash fragment (wildcard path)', () => {
      expect(matchPattern('https://example.com/path#section', '*://example.com/*')).toBe(true);
    });

    test('URL with hash fragment (specific path)', () => {
      expect(matchPattern('https://example.com/path#section', '*://example.com/path')).toBe(true);
    });

    test('URL with both query string and hash fragment (specific path)', () => {
      expect(matchPattern('https://example.com/path?key=value#section', '*://example.com/path')).toBe(true);
    });
  });
});

describe('urlMatchesPatterns', () => {
  test('matches any pattern in the list', () => {
    const patterns = ['*://app.slack.com/*', '*://example.com/*'];
    expect(urlMatchesPatterns('https://app.slack.com/path', patterns)).toBe(true);
  });

  test('returns false if no pattern matches', () => {
    const patterns = ['*://app.slack.com/*', '*://example.com/*'];
    expect(urlMatchesPatterns('https://other.com/path', patterns)).toBe(false);
  });

  test('empty patterns list returns false', () => {
    expect(urlMatchesPatterns('https://example.com/path', [])).toBe(false);
  });

  describe('with excludePatterns', () => {
    test('excludes URL matching an exclude pattern', () => {
      const patterns = ['*://*.atlassian.net/*'];
      const excludes = ['*://*.atlassian.net/wiki/*'];
      expect(urlMatchesPatterns('https://myteam.atlassian.net/wiki/spaces', patterns, excludes)).toBe(false);
    });

    test('includes URL not matching exclude patterns', () => {
      const patterns = ['*://*.atlassian.net/*'];
      const excludes = ['*://*.atlassian.net/wiki/*'];
      expect(urlMatchesPatterns('https://myteam.atlassian.net/browse/PROJ-123', patterns, excludes)).toBe(true);
    });

    test('excludePatterns undefined behaves like no excludes', () => {
      const patterns = ['*://example.com/*'];
      expect(urlMatchesPatterns('https://example.com/path', patterns, undefined)).toBe(true);
    });

    test('empty excludePatterns array behaves like no excludes', () => {
      const patterns = ['*://example.com/*'];
      expect(urlMatchesPatterns('https://example.com/path', patterns, [])).toBe(true);
    });

    test('URL not matching include patterns returns false regardless of excludes', () => {
      const patterns = ['*://example.com/*'];
      const excludes = ['*://other.com/*'];
      expect(urlMatchesPatterns('https://unrelated.com/path', patterns, excludes)).toBe(false);
    });

    test('Jira/Confluence scenario: wiki URL excluded from broad Atlassian pattern', () => {
      const jiraPatterns = ['*://*.atlassian.net/*'];
      const jiraExcludes = ['*://*.atlassian.net/wiki/*'];
      // Jira URL matches
      expect(urlMatchesPatterns('https://myteam.atlassian.net/browse/PROJ-1', jiraPatterns, jiraExcludes)).toBe(true);
      // Confluence wiki URL excluded
      expect(urlMatchesPatterns('https://myteam.atlassian.net/wiki/spaces/TEAM', jiraPatterns, jiraExcludes)).toBe(
        false,
      );
    });
  });
});
