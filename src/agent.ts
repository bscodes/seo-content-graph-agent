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
    const { clusters, sparseEdges } = this.stepCluster(pages, logs);

    // Step 3: Interlink Recommendation Generation
    const recommendations = this.stepInterlink(pages, clusters, sparseEdges, logs);

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
    
    // Instead of a dense NxN matrix, we use a Sparse Graph (Top-K ANN approximation)
    const sparseEdges = new Map<number, { targetIdx: number; score: number }[]>();
    const INTERLINK_THRESHOLD = this.similarityThreshold * 0.85;

    for (let i = 0; i < N; i++) {
      const edges: { targetIdx: number; score: number }[] = [];
      for (let j = 0; j < N; j++) {
        if (i !== j) {
          const score = cosineSimilarity(pages[i].embedding!, pages[j].embedding!);
          if (score >= INTERLINK_THRESHOLD) {
            edges.push({ targetIdx: j, score });
          }
        }
      }
      // Keep only top 50 matches per page to prevent memory bloat on massive graphs
      edges.sort((a, b) => b.score - a.score);
      sparseEdges.set(i, edges.slice(0, 50));
    }

    // Semantic Clustering (True Connected Components via BFS)
    const visited = new Set<number>();
    const clusters: ClusterGroup[] = [];

    for (let i = 0; i < N; i++) {
      if (visited.has(i)) continue;

      const clusterMembers: number[] = [];
      const queue: number[] = [i];
      visited.add(i);

      while (queue.length > 0) {
        const current = queue.shift()!;
        clusterMembers.push(current);

        const currentEdges = sparseEdges.get(current) || [];
        for (const edge of currentEdges) {
          if (!visited.has(edge.targetIdx) && edge.score >= this.similarityThreshold) {
            visited.add(edge.targetIdx);
            queue.push(edge.targetIdx);
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
    return { clusters, sparseEdges };
  }

  // Node C: Interlink Engine
  private stepInterlink(
    pages: PageNode[],
    clusters: ClusterGroup[],
    sparseEdges: Map<number, { targetIdx: number; score: number }[]>,
    logs: string[]
  ): InternalLinkRecommendation[] {
    const recommendations: InternalLinkRecommendation[] = [];
    const existingPairs = new Set<string>();

    pages.forEach((sourcePage, i) => {
      // Find candidate target pages
      const candidates: { targetIdx: number; score: number }[] = [];
      const edges = sparseEdges.get(i) || [];

      edges.forEach(edge => {
        const targetPage = pages[edge.targetIdx];
        if (sourcePage.url === targetPage.url) return;
        
        let score = edge.score;
        if (sourcePage.clusterId === targetPage.clusterId) {
          score += 0.08; // Cluster synergy bonus
        }

        candidates.push({ targetIdx: edge.targetIdx, score: Math.min(0.99, score) });
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
          const anchorText = this.generateAnchorText(sourcePage.url, targetPage.url, targetPage.targetKeyword, targetPage.title);
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

  // Anchor text generator (Deterministic based on source and target)
  private generateAnchorText(sourceUrl: string, targetUrl: string, keyword: string, title: string): string {
    const formattedKw = keyword.toLowerCase().trim();
    const variations = [
      formattedKw,
      `guide to ${formattedKw}`,
      `learn more about ${formattedKw}`,
      formattedKw,
      `${formattedKw} best practices`
    ];
    
    // Deterministic hash
    const key = sourceUrl + targetUrl;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    
    return variations[Math.abs(hash) % variations.length];
  }
}
