import { z } from 'zod';

// PageNode validation
export const PageNodeSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  title: z.string().min(1, "Title cannot be empty"),
  targetKeyword: z.string().min(1, "Target keyword cannot be empty"),
  category: z.string().optional(),
  contentSnippet: z.string().optional(),
  existingLinks: z.array(z.string().url("Existing links must be valid URLs")).optional()
});

// Sitemap validation
export const SitemapSchema = z.object({
  url: z.string().url().optional(),
  pages: z.array(PageNodeSchema)
    .min(1, "Sitemap must contain at least one page")
    .transform(pages => {
      // Automatically deduplicate by URL
      const seen = new Set<string>();
      return pages.filter(p => {
        if (seen.has(p.url)) return false;
        seen.add(p.url);
        return true;
      });
    })
});

// Threshold validation
export const ThresholdSchema = z.number()
  .min(0, "Threshold must be between 0.0 and 1.0")
  .max(1, "Threshold must be between 0.0 and 1.0");
