import { describe, test, expect } from 'vitest';
import { SEOContentGraphAgent } from '../src/agent';
import { SitemapInput } from '../src/types';

describe('SEOContentGraphAgent Unit Tests', () => {

  test('Test 1: Related blog posts are grouped into semantic clusters', async () => {
    const sitemap: SitemapInput = {
      pages: [
        {
          url: 'https://example.com/saas-billing-1',
          title: 'SaaS Billing Models and Recurring Subscriptions',
          targetKeyword: 'saas billing models',
          category: 'Billing'
        },
        {
          url: 'https://example.com/saas-billing-2',
          title: 'How to Implement SaaS Billing Engines with Stripe',
          targetKeyword: 'saas billing stripe',
          category: 'Billing'
        },
        {
          url: 'https://example.com/saas-billing-3',
          title: 'Metering Events for SaaS Usage Based Billing',
          targetKeyword: 'usage based billing',
          category: 'Billing'
        },
        {
          url: 'https://example.com/saas-billing-4',
          title: 'Dunning and Churn Reduction in SaaS Billing',
          targetKeyword: 'saas dunning billing',
          category: 'Billing'
        },
        {
          url: 'https://example.com/saas-billing-5',
          title: 'Managing Credit Card Retries in SaaS Billing',
          targetKeyword: 'saas credit card retries billing',
          category: 'Billing'
        }
      ]
    };

    const agent = new SEOContentGraphAgent(undefined, 0.5);
    const state = await agent.analyze(sitemap);

    expect(state.pages.length).toBe(5);
    expect(state.clusters.length).toBeGreaterThanOrEqual(1);
    
    // First cluster should contain all or most closely related billing pages
    const mainCluster = state.clusters[0];
    expect(mainCluster.pageUrls.length).toBeGreaterThanOrEqual(3);
  });

  test('Test 2: Strict Invariant - No page ever recommends an internal link to itself', async () => {
    const sitemap: SitemapInput = {
      pages: [
        {
          url: 'https://example.com/page-a',
          title: 'PostgreSQL Database Optimization Guide',
          targetKeyword: 'postgres optimization'
        },
        {
          url: 'https://example.com/page-b',
          title: 'PostgreSQL Query Performance and Indexing',
          targetKeyword: 'postgres indexing optimization'
        }
      ]
    };

    const agent = new SEOContentGraphAgent(undefined, 0.4);
    const state = await agent.analyze(sitemap);

    expect(state.recommendations.length).toBeGreaterThan(0);
    
    state.recommendations.forEach(rec => {
      // Critical invariant: sourceUrl !== targetUrl
      expect(rec.sourceUrl).not.toEqual(rec.targetUrl);
    });
  });

  test('Test 3: Relevance scores are bounded between 0.0 and 1.0 and anchor text is valid', async () => {
    const sitemap: SitemapInput = {
      pages: [
        {
          url: 'https://example.com/jwt-auth',
          title: 'JWT Authentication Guide',
          targetKeyword: 'jwt auth'
        },
        {
          url: 'https://example.com/okta-sso',
          title: 'Okta Enterprise SSO Integration',
          targetKeyword: 'okta sso enterprise'
        }
      ]
    };

    const agent = new SEOContentGraphAgent(undefined, 0.3);
    const state = await agent.analyze(sitemap);

    state.recommendations.forEach(rec => {
      expect(rec.relevanceScore).toBeGreaterThanOrEqual(0.0);
      expect(rec.relevanceScore).toBeLessThanOrEqual(1.0);
      expect(typeof rec.suggestedAnchorText).toBe('string');
      expect(rec.suggestedAnchorText.length).toBeGreaterThan(0);
    });
  });

  test('Test 4: Transitive Chain Connected Components Clustering', async () => {
    // Custom provider to simulate A -> B -> C similarity chain
    // A and B have cosine sim ~0.707
    // B and C have cosine sim ~0.707
    // A and C have cosine sim 0.0
    const mockProvider = {
      embed: async (texts: string[]) => {
        return texts.map(text => {
          if (text.includes('Page A')) return [1.0, 0.0, 0.0];
          if (text.includes('Page B')) return [0.707, 0.707, 0.0];
          if (text.includes('Page C')) return [0.0, 1.0, 0.0];
          return [0, 0, 1];
        });
      }
    };

    const sitemap: SitemapInput = {
      pages: [
        { url: 'A', title: 'Page A', targetKeyword: 'A' },
        { url: 'B', title: 'Page B', targetKeyword: 'B' },
        { url: 'C', title: 'Page C', targetKeyword: 'C' }
      ]
    };

    const agent = new SEOContentGraphAgent(mockProvider, 0.65);
    const state = await agent.analyze(sitemap);

    // B connects A and C, so they should form a single connected component cluster.
    expect(state.clusters.length).toBe(1);
    expect(state.clusters[0].pageUrls).toContain('A');
    expect(state.clusters[0].pageUrls).toContain('B');
    expect(state.clusters[0].pageUrls).toContain('C');
  });
});
