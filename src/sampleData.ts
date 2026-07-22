import { SitemapInput } from './types.js';

export const SAMPLE_SITEMAP: SitemapInput = {
  url: 'https://api.acme-saas.com/sitemap.json',
  pages: [
    // Cluster 1: SaaS Billing & Subscriptions
    {
      url: 'https://acme-saas.com/blog/saas-billing-models-guide',
      title: 'The Definitive Guide to SaaS Billing Models in 2026',
      targetKeyword: 'saas billing models',
      category: 'Billing & Pricing',
      contentSnippet: 'Learn how usage-based pricing, seats, and tiered subscriptions impact MRR retention and customer lifetime value.'
    },
    {
      url: 'https://acme-saas.com/blog/stripe-vs-paddle-subscription-engine',
      title: 'Stripe vs Paddle: Choosing the Right Billing Engine',
      targetKeyword: 'stripe vs paddle saas',
      category: 'Billing & Pricing',
      contentSnippet: 'Comparing merchant of record models against traditional payment gateways for global SaaS taxation and recurring revenue.'
    },
    {
      url: 'https://acme-saas.com/blog/usage-based-pricing-implementation',
      title: 'Implementing Usage-Based Pricing with Metered Events',
      targetKeyword: 'usage based pricing meter',
      category: 'Billing & Pricing',
      contentSnippet: 'Architecting high-throughput event metering pipelines using Redis and Kafka for transparent billing invoicing.'
    },
    {
      url: 'https://acme-saas.com/blog/dunning-management-reduce-churn',
      title: 'Automated Dunning Management: Reducing Involuntary Churn',
      targetKeyword: 'dunning management saas',
      category: 'Billing & Pricing',
      contentSnippet: 'Best practices for automated credit card retry schedules, email webhooks, and grace period workflows.'
    },

    // Cluster 2: Auth & Security
    {
      url: 'https://acme-saas.com/blog/jwt-vs-session-cookies-security',
      title: 'JWT vs Session Cookies for Multi-Tenant SaaS Apps',
      targetKeyword: 'jwt vs session cookies',
      category: 'Security & Auth',
      contentSnippet: 'Evaluating token revocation, XSS risks, and cross-domain authentication in modern single-page applications.'
    },
    {
      url: 'https://acme-saas.com/blog/saml-sso-enterprise-onboarding',
      title: 'Building SAML 2.0 & Okta SSO for Enterprise Customers',
      targetKeyword: 'enterprise saml sso okta',
      category: 'Security & Auth',
      contentSnippet: 'Step-by-step guide to provisioning identity providers, tenant domain mapping, and SCIM user sync.'
    },
    {
      url: 'https://acme-saas.com/blog/rbac-permission-matrix-design',
      title: 'Designing Granular RBAC Permissions for Multi-Tenant DBs',
      targetKeyword: 'rbac permission matrix',
      category: 'Security & Auth',
      contentSnippet: 'Role-based access control architecture for enterprise organizations with custom roles and row-level security.'
    },

    // Cluster 3: Cloud Infrastructure & DevOps
    {
      url: 'https://acme-saas.com/blog/zero-downtime-postgres-migrations',
      title: 'Zero-Downtime PostgreSQL Schema Migrations at Scale',
      targetKeyword: 'zero downtime postgres migrations',
      category: 'DevOps & Infra',
      contentSnippet: 'How to perform non-blocking column additions, index creation, and table partition rewrites under live traffic.'
    },
    {
      url: 'https://acme-saas.com/blog/kubernetes-horizontal-pod-autoscaling',
      title: 'Optimizing Kubernetes HPA for Microservice Burst Traffic',
      targetKeyword: 'kubernetes hpa autoscaling',
      category: 'DevOps & Infra',
      contentSnippet: 'Configuring custom Prometheus metrics to scale pods before CPU bottlenecks degrade HTTP API latency.'
    },
    {
      url: 'https://acme-saas.com/blog/serverless-edge-caching-cloudflare',
      title: 'Latency Reduction with Cloudflare Workers Edge Caching',
      targetKeyword: 'cloudflare workers edge cache',
      category: 'DevOps & Infra',
      contentSnippet: 'Distributing API query caching to 300+ global edge locations with stale-while-revalidate headers.'
    },

    // Cluster 4: Product Analytics & Growth
    {
      url: 'https://acme-saas.com/blog/product-led-growth-cohort-analysis',
      title: 'Product-Led Growth: Measuring User Activation & Cohorts',
      targetKeyword: 'product led growth cohorts',
      category: 'Analytics & Growth',
      contentSnippet: 'Defining time-to-first-value milestones, feature adoption funnels, and retention cohort heatmaps.'
    },
    {
      url: 'https://acme-saas.com/blog/feature-flag-driven-a-b-testing',
      title: 'Feature Flag Architectures for Real-Time A/B Testing',
      targetKeyword: 'feature flag ab testing',
      category: 'Analytics & Growth',
      contentSnippet: 'Evaluating client-side vs server-side flag evaluation, statsig integration, and rollback safety.'
    }
  ]
};
