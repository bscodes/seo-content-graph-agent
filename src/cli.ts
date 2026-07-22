#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import { SEOContentGraphAgent } from './agent';
import { SAMPLE_SITEMAP } from './sampleData';
import { SitemapInput } from './types';

const program = new Command();

program
  .name('seo-graph')
  .description('SEO Content Graph Agent - Ingest sitemaps, cluster semantic topics, and generate internal link graphs')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze sitemap and output internal link recommendations')
  .option('-s, --sitemap <path>', 'Path to sitemap JSON file')
  .option('-t, --threshold <number>', 'Similarity threshold (0.0 - 1.0)', '0.65')
  .option('-o, --output <path>', 'Output JSON file path')
  .action((options) => {
    try {
      console.log('🤖 SEO Content Graph Agent v1.0.0');
      console.log('=================================');

      let sitemapData: SitemapInput = SAMPLE_SITEMAP;

      if (options.sitemap) {
        if (fs.existsSync(options.sitemap)) {
          const raw = fs.readFileSync(options.sitemap, 'utf-8');
          sitemapData = JSON.parse(raw);
          console.log(`✓ Loaded custom sitemap from ${options.sitemap}`);
        } else {
          console.error(`❌ Error: Sitemap file not found at ${options.sitemap}`);
          process.exit(1);
        }
      } else {
        console.log('ℹ️  No sitemap path specified. Running analysis on sample SaaS blog dataset...');
      }

      const threshold = parseFloat(options.threshold) || 0.65;
      const agent = new SEOContentGraphAgent(threshold);

      console.log(`⚙️  Running Graph State Machine (Threshold: ${threshold})...\n`);
      const result = agent.analyze(sitemapData);

      result.logs.forEach(log => console.log(`  ${log}`));

      console.log('\n📊 Summary Metrics:');
      console.log(`  Total Pages Analyzed : ${result.metrics.totalPages}`);
      console.log(`  Semantic Clusters    : ${result.metrics.clusterCount}`);
      console.log(`  Recommended Links    : ${result.metrics.recommendedLinks}`);
      console.log(`  Avg Relevance Score  : ${result.metrics.avgRelevanceScore}`);
      console.log(`  PageRank Gain Metric : ${result.metrics.pageRankDistributionGain}`);

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`\n✅ Results saved to ${options.output}`);
      } else {
        console.log('\nTop Recommended Internal Links Sample:');
        result.recommendations.slice(0, 5).forEach((rec, idx) => {
          console.log(`\n  [${idx + 1}] ${rec.sourceTitle}`);
          console.log(`      ↳ Target : ${rec.targetTitle}`);
          console.log(`      ↳ Anchor : "${rec.suggestedAnchorText}"`);
          console.log(`      ↳ Score  : ${rec.relevanceScore}`);
        });
      }

    } catch (err: any) {
      console.error('❌ Execution error:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
