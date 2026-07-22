import { PageNode, InternalLinkRecommendation, ClusterGroup, GraphState, SitemapInput } from './types.js';
import { EmbeddingProvider, FakeEmbeddingProvider, cosineSimilarity, computePageRankCentrality } from './embeddings.js';

const CLUSTER_COLORS = [
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Sapphire Blue
  '#EC4899', // Crimson Pink
  '#8B5CF6', // Purple Accent
  '#06B6D4', // Cyan
];

function buildAdjacencyList(pages: PageNode[], additionalLinks: {sourceUrl: string, targetUrl: string}[] = []): number[][] {
  const urlToIndex = new Map(pages.map((p, i) => [p.url, i]));
  const adjList = Array.from({ length: pages.length }, () => [] as number[]);
  
  pages.forEach((p, i) => {
    (p.existingLinks || []).forEach(targetUrl => {
      const targetIdx = urlToIndex.get(targetUrl);
      if (targetIdx !== undefined && targetIdx !== i) {
        adjList[i].push(targetIdx);
      }
    });
  });

  additionalLinks.forEach(link => {
    const sourceIdx = urlToIndex.get(link.sourceUrl);
    const targetIdx = urlToIndex.get(link.targetUrl);
    if (sourceIdx !== undefined && targetIdx !== undefined && sourceIdx !== targetIdx) {
      adjList[sourceIdx].push(targetIdx);
    }
  });

  return adjList.map(edges => Array.from(new Set(edges)));
}

export class SEOContentGraphAgent {
  private similarityThreshold: number;
  private maxLinksPerPage: number;
  private provider: EmbeddingProvider;

  constructor(provider?: EmbeddingProvider, similarityThreshold = 0.65, maxLinksPerPage = 3) {
    this.provider = provider || new FakeEmbeddingProvider();
    this.similarityThreshold = similarityThreshold;
    this.maxLinksPerPage = maxLinksPerPage;
  }

  public setSimilarityThreshold(threshold: number) {
    this.similarityThreshold = threshold;
  }

  // Master 3-Step Execution Pipeline (Ingest -> Cluster -> Interlink)
  public async analyze(input: SitemapInput): Promise<GraphState> {
    const logs: string[] = [];
    logs.push(`[AGENT INGEST] Parsing ${input.pages.length} sitemap pages...`);

    // Step 1: Ingest & Embed
    const pages = await this.stepIngest(input.pages, logs);

    // Compute Base PageRank from existing links
    const baseAdjList = buildAdjacencyList(pages);
    const basePageRankMap = computePageRankCentrality(pages, baseAdjList);
    pages.forEach(p => {
      p.pageRankScore = basePageRankMap[p.url] || 0;
    });

    // Step 2: Cluster based on semantic similarity
    const { clusters, similarityMatrix } = this.stepCluster(pages, logs);

    // Step 3: Interlink Recommendation Generation
    const recommendations = this.stepInterlink(pages, clusters, similarityMatrix, logs);

    // Measure Before/After PageRank
    const newAdjList = buildAdjacencyList(pages, recommendations);
    const newPageRankMap = computePageRankCentrality(pages, newAdjList);

    // Calculate actual PageRank gain for targeted pages
    let totalGain = 0;
    let targetCount = 0;
    const targetedUrls = new Set(recommendations.map(r => r.targetUrl));
    
    targetedUrls.forEach(url => {
      const baseScore = basePageRankMap[url] || 0;
      const newScore = newPageRankMap[url] || 0;
      if (baseScore > 0) {
        totalGain += ((newScore - baseScore) / baseScore) * 100;
        targetCount++;
      }
    });

    const avgPrGain = targetCount > 0 ? (totalGain / targetCount) : 0;

    // Calculate Summary Metrics
    const avgScore = recommendations.length > 0
      ? recommendations.reduce((acc, r) => acc + r.relevanceScore, 0) / recommendations.length
      : 0;

    const metrics = {
      totalPages: pages.length,
      clusterCount: clusters.length,
      recommendedLinks: recommendations.length,
      avgRelevanceScore: parseFloat(avgScore.toFixed(2)),
      pageRankDistributionGain: targetCount > 0 
        ? `+${avgPrGain.toFixed(1)}% Avg Target PR Gain` 
        : '0% (No new links)'
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
  private async stepIngest(inputPages: SitemapInput['pages'], logs: string[]): Promise<PageNode[]> {
    const textsToEmbed = inputPages.map(page => 
      `${page.title} ${page.targetKeyword} ${page.category || ''} ${page.contentSnippet || ''}`
    );
    
    const embeddings = await this.provider.embed(textsToEmbed);
    
    return inputPages.map((page, idx) => {
      return {
        id: `page-${idx + 1}`,
        url: page.url,
        title: page.title,
        targetKeyword: page.targetKeyword,
        category: page.category || 'General',
        contentSnippet: page.contentSnippet,
        embedding: embeddings[idx],
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
    return { clusters, similarityMatrix };
  }

  // Node C: Interlink Engine
  private stepInterlink(
    pages: PageNode[],
    clusters: ClusterGroup[],
    similarityMatrix: number[][],
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
