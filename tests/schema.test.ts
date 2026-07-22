import { describe, test, expect } from 'vitest';
import { SitemapSchema, ThresholdSchema } from '../src/schema';

describe('Schema Validation Tests', () => {

  test('Validates correct SitemapInput', () => {
    const valid = {
      pages: [
        {
          url: 'https://example.com/page-1',
          title: 'Page 1',
          targetKeyword: 'page'
        },
        {
          url: 'https://example.com/page-2',
          title: 'Page 2',
          targetKeyword: 'page'
        }
      ]
    };
    
    expect(() => SitemapSchema.parse(valid)).not.toThrow();
  });

  test('Rejects invalid URLs', () => {
    const invalidUrl = {
      pages: [
        {
          url: 'not-a-url',
          title: 'Page 1',
          targetKeyword: 'page'
        }
      ]
    };

    expect(() => SitemapSchema.parse(invalidUrl)).toThrow(/Must be a valid URL/i);
  });

  test('Rejects empty titles and keywords', () => {
    const invalidEmpty = {
      pages: [
        {
          url: 'https://example.com/page-1',
          title: '',
          targetKeyword: ''
        }
      ]
    };

    expect(() => SitemapSchema.parse(invalidEmpty)).toThrow();
  });

  test('Automatically deduplicates duplicate URLs instead of rejecting', () => {
    const duplicates = {
      pages: [
        {
          url: 'https://example.com/page-1',
          title: 'Page 1',
          targetKeyword: 'page'
        },
        {
          url: 'https://example.com/page-1',
          title: 'Duplicate Page',
          targetKeyword: 'page'
        }
      ]
    };

    const result = SitemapSchema.parse(duplicates);
    expect(result.pages.length).toBe(1);
    expect(result.pages[0].title).toBe('Page 1'); // Keeps the first occurrence
  });

  test('Validates Thresholds correctly', () => {
    expect(ThresholdSchema.parse(0.5)).toBe(0.5);
    expect(ThresholdSchema.parse(0)).toBe(0);
    expect(ThresholdSchema.parse(1)).toBe(1);

    expect(() => ThresholdSchema.parse(-0.1)).toThrow();
    expect(() => ThresholdSchema.parse(1.1)).toThrow();
    expect(() => ThresholdSchema.parse(2)).toThrow();
  });
});
