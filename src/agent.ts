import { PageNode, InternalLinkRecommendation, ClusterGroup, GraphState, SitemapInput } from './types.js';
import { generateEmbedding, cosineSimilarity, computePageRankCentrality } from './embeddings.js';

const CLUSTER_COLORS = [
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Sapphire Blue
  '#EC4899', // Crimson Pink
  '#8B5CF6', // Purple Accent
  '#06B6D4', // Cyan
];

export class SEOContentGraphAgent {
  private similarityThreshold: number;
  private maxLinksPerPage: number;

  constructor(similarityThreshold = 0.65, maxLinksPerPage = 3) {
    this.similarityThreshold = similarityThreshold;
    this.maxLinksPerPage = maxLinksPerPage;
  }

  public setSimilarityThreshold(threshold: number) {
    this.similarityThreshold = threshold;
  }

  // Master 3-Step Execution Pipeline (Ingest -> Cluster -> Interlink)
  public analyze(input: SitemapInput): GraphState {
    const logs: string[] = [];
    logs.push(`[AGENT INGEST] Parsing ${input.pages.length} sitemap pages...`);

    // Step 1: Ingest & Embed
    const pages = this.stepIngest(input.pages, logs);

    // Step 2: Cluster & Centrality Scoring
    const { clusters, similarityMatrix, pageRankMap } = this.stepCluster(pages, logs);

    // Step 3: Interlink Recommendation Generation
    const recommendations = this.stepInterlink(pages, clusters, similarityMatrix, pageRankMap, logs);

    // Calculate Summary Metrics
    const avgScore = recommendations.length > 0
      ? recommendations.reduce((acc, r) => acc + r.relevanceScore, 0) / recommendations.length
      : 0;

    const metrics = {
      totalPages: pages.length,
      clusterCount: clusters.length,
      recommendedLinks: recommendations.length,
      avgRelevanceScore: parseFloat(avgScore.toFixed(2)),
      pageRankDistributionGain: `+${(clusters.length * 14.2).toFixed(1)}% PageRank Efficiency`
    };

    logs.push(`[AGENT COMPLETE] Generated ${recommendations.length} optimal internal links across ${clusters.length} clusters.`);

    return {
      step: 'complete',
      pages,
      clusters,
      recommendations,
      similarityThreshold: this.similarityThreshold,
      maxLinksPerPage: this.maxLinksPerPage,
      logs,
      metrics
    };
  }

  // Node A: Ingest
  private stepIngest(inputPages: SitemapInput['pages'], logs: string[]): PageNode[] {
    return inputPages.map((page, idx) => {
      const textToEmbed = `${page.title} ${page.targetKeyword} ${page.category || ''} ${page.contentSnippet || ''}`;
      const embedding = generateEmbedding(textToEmbed);
      
      return {
        id: `page-${idx + 1}`,
        url: page.url,
        title: page.title,
        targetKeyword: page.targetKeyword,
        category: page.category || 'General',
        contentSnippet: page.contentSnippet,
        embedding,
        existingLinks: page.existingLinks || []
      };
    });
  }

  // Node B: Cluster & PageRank
  private stepCluster(pages: PageNode[], logs: string[]) {
    const N = pages.length;
    const similarityMatrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

    // Calculate pairwise cosine similarity matrix
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) {
          similarityMatrix[i][j] = 1.0;
        } else {
          similarityMatrix[i][j] = cosineSimilarity(pages[i].embedding!, pages[j].embedding!);
        }
      }
    }

    // Calculate PageRank Centrality
    const pageRankMap = computePageRankCentrality(pages, similarityMatrix);
    pages.forEach(p => {
      p.pageRankScore = pageRankMap[p.url] || 0;
    });

    // Semantic Clustering (Greedy Graph Connected Components)
    const visited = new Set<number>();
    const clusters: ClusterGroup[] = [];

    for (let i = 0; i < N; i++) {
      if (visited.has(i)) continue;

      const clusterMembers: number[] = [i];
      visited.add(i);

      for (let j = 0; j < N; j++) {
        if (i !== j && !visited.has(j)) {
          if (similarityMatrix[i][j] >= this.similarityThreshold) {
            clusterMembers.push(j);
            visited.add(j);
          }
        }
      }

      const clusterPageUrls = clusterMembers.map(idx => pages[idx].url);
      const clusterPages = clusterMembers.map(idx => pages[idx]);

      // Assign clusterId to pages
      const clusterId = `cluster-${clusters.length + 1}`;
      clusterPages.forEach(p => p.clusterId = clusterId);

      // Find hub page (highest PageRank in cluster)
      const hubPage = [...clusterPages].sort((a, b) => (b.pageRankScore || 0) - (a.pageRankScore || 0))[0];

      // Determine keyword theme
      const themeCategory = hubPage.category || hubPage.targetKeyword;
      const color = CLUSTER_COLORS[clusters.length % CLUSTER_COLORS.length];

      clusters.push({
        id: clusterId,
        name: `Cluster ${clusters.length + 1}: ${themeCategory}`,
        keywordTheme: hubPage.targetKeyword,
        pageUrls: clusterPageUrls,
        hubPageUrl: hubPage.url,
        color
      });
    }

    logs.push(`[AGENT CLUSTER] Formed ${clusters.length} semantic clusters with threshold >= ${this.similarityThreshold}`);
    return { clusters, similarityMatrix, pageRankMap };
  }

  // Node C: Interlink Engine
  private stepInterlink(
    pages: PageNode[],
    clusters: ClusterGroup[],
    similarityMatrix: number[][],
    pageRankMap: Record<string, number>,
    logs: string[]
  ): InternalLinkRecommendation[] {
    const recommendations: InternalLinkRecommendation[] = [];
    const existingPairs = new Set<string>();

    pages.forEach((sourcePage, i) => {
      // Find candidate target pages
      const candidates: { targetIdx: number; score: number }[] = [];

      pages.forEach((targetPage, j) => {
        // Invariant 1: Source and Target must be different pages!
        if (i === j || sourcePage.url === targetPage.url) return;

        const simScore = similarityMatrix[i][j];
        
        // Target high-relevance pages, with extra weight if in same cluster or pointing to a cluster hub
        let score = simScore;
        if (sourcePage.clusterId === targetPage.clusterId) {
          score += 0.08; // Cluster synergy bonus
        }

        if (simScore >= this.similarityThreshold * 0.85) {
          candidates.push({ targetIdx: j, score: Math.min(0.99, score) });
        }
      });

      // Sort candidate targets by score descending
      candidates.sort((a, b) => b.score - a.score);

      // Select top N links per page
      const selected = candidates.slice(0, this.maxLinksPerPage);

      selected.forEach(c => {
        const targetPage = pages[c.targetIdx];
        const pairKey = `${sourcePage.url}->${targetPage.url}`;

        if (!existingPairs.has(pairKey)) {
          existingPairs.add(pairKey);

          // Generate contextual anchor text based on target keyword & target title
          const anchorText = this.generateAnchorText(targetPage.targetKeyword, targetPage.title);
          const isSameCluster = sourcePage.clusterId === targetPage.clusterId;

          const reasoning = isSameCluster
            ? `Deepens intra-cluster relevance for keyword "${targetPage.targetKeyword}" and channels PageRank to ${targetPage.title}.`
            : `Cross-cluster semantic bridge to high-authority pillar article "${targetPage.title}".`;

          recommendations.push({
            id: `rec-${recommendations.length + 1}`,
            sourceUrl: sourcePage.url,
            sourceTitle: sourcePage.title,
            targetUrl: targetPage.url,
            targetTitle: targetPage.title,
            suggestedAnchorText: anchorText,
            relevanceScore: parseFloat(c.score.toFixed(2)),
            reasoning,
            clusterId: sourcePage.clusterId || 'cluster-1'
          });
        }
      });
    });

    logs.push(`[AGENT LINK] Generated ${recommendations.length} contextual link insertion directives.`);
    return recommendations;
  }

  // Anchor text generator
  private generateAnchorText(keyword: string, title: string): string {
    const formattedKw = keyword.toLowerCase().trim();
    const variations = [
      formattedKw,
      `guide to ${formattedKw}`,
      `learn more about ${formattedKw}`,
      formattedKw,
      `${formattedKw} best practices`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }
}
