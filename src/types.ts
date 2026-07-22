export interface PageNode {
  id: string;
  url: string;
  title: string;
  targetKeyword: string;
  category?: string;
  contentSnippet?: string;
  embedding?: number[];
  pageRankScore?: number;
  clusterId?: string;
  existingLinks?: string[];
}

export interface InternalLinkRecommendation {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  targetUrl: string;
  targetTitle: string;
  suggestedAnchorText: string;
  relevanceScore: number; // 0.0 to 1.0
  reasoning: string;
  clusterId: string;
}

export interface ClusterGroup {
  id: string;
  name: string;
  keywordTheme: string;
  pageUrls: string[];
  hubPageUrl: string;
  color: string;
}

export interface GraphState {
  step: 'idle' | 'ingesting' | 'clustering' | 'linking' | 'complete';
  pages: PageNode[];
  clusters: ClusterGroup[];
  recommendations: InternalLinkRecommendation[];
  similarityThreshold: number;
  maxLinksPerPage: number;
  logs: string[];
  metrics: {
    totalPages: number;
    clusterCount: number;
    recommendedLinks: number;
    avgRelevanceScore: number;
    pageRankDistributionGain: string;
  };
}

export interface SitemapInput {
  url?: string;
  pages: {
    url: string;
    title: string;
    targetKeyword: string;
    category?: string;
    contentSnippet?: string;
    existingLinks?: string[];
  }[];
}
