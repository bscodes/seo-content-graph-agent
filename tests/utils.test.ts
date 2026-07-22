import { describe, test, expect } from 'vitest';
import { escapeHtml, ensureHttpsUrl } from '../src/utils';

describe('Utils: escapeHtml', () => {
  test('Escapes malicious tags correctly', () => {
    const input = '<script>alert("xss")</script>';
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  test('Escapes ampersands and single quotes', () => {
    const input = "Tom & Jerry's";
    const expected = "Tom &amp; Jerry&#039;s";
    expect(escapeHtml(input)).toBe(expected);
  });
});

describe('Utils: ensureHttpsUrl', () => {
  test('Returns URL untouched if it is already HTTPS', () => {
    const url = 'https://example.com/page';
    expect(ensureHttpsUrl(url)).toBe(url);
  });

  test('Upgrades HTTP to HTTPS', () => {
    const url = 'http://example.com/page?query=1';
    expect(ensureHttpsUrl(url)).toBe('https://example.com/page?query=1');
  });

  test('Rejects javascript: protocols and returns fallback', () => {
    const url = 'javascript:alert(1)';
    expect(ensureHttpsUrl(url)).toBe('#');
  });

  test('Rejects malformed strings and returns fallback', () => {
    const url = 'not-a-url';
    expect(ensureHttpsUrl(url)).toBe('#');
  });
});
