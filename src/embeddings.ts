import { PageNode } from './types.js';
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    try {
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: texts,
      });
      return embeddings;
    } catch (error) {
      console.error('[OpenAIEmbeddingProvider] Error fetching embeddings:', error);
      throw error;
    }
  }
}

export class FakeEmbeddingProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    // Deterministic fake provider based on categories or keywords for testing
    return texts.map(text => {
      const normalized = text.toLowerCase();
      const vector = new Array(64).fill(0);
      
      // Map known categories to orthogonal vectors for perfect clustering in tests
      if (normalized.includes('billing') || normalized.includes('pricing') || normalized.includes('stripe')) {
        vector[0] = 1;
      } else if (normalized.includes('auth') || normalized.includes('security') || normalized.includes('sso') || normalized.includes('jwt')) {
        vector[1] = 1;
      } else if (normalized.includes('postgres') || normalized.includes('infra') || normalized.includes('kubernetes')) {
        vector[2] = 1;
      } else if (normalized.includes('analytics') || normalized.includes('growth')) {
        vector[3] = 1;
      } else {
        // Fallback to simple hashing if no known category matches
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = (hash << 5) - hash + text.charCodeAt(i);
          hash |= 0;
        }
        const dim = Math.abs(hash) % 64;
        vector[dim] = 1;
      }
      
      return vector;
    });
  }
}

// Compute Cosine Similarity between 2 vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.min(1.0, Math.max(0.0, sim));
}

// PageRank Centrality Calculator over directed adjacency list
export function computePageRankCentrality(
  pages: PageNode[],
  adjacencyList: number[][],
  iterations = 20,
  dampingFactor = 0.85
): Record<string, number> {
  const N = pages.length;
  if (N === 0) return {};

  let ranks: number[] = new Array(N).fill(1 / N);

  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Array(N).fill((1 - dampingFactor) / N);
    
    let danglingSum = 0;
    for (let i = 0; i < N; i++) {
      if (adjacencyList[i].length === 0) {
        danglingSum += ranks[i];
      }
    }
    
    const danglingDistribution = (dampingFactor * danglingSum) / N;
    for (let i = 0; i < N; i++) {
      newRanks[i] += danglingDistribution;
    }

    for (let j = 0; j < N; j++) {
      const outEdges = adjacencyList[j];
      const outDegree = outEdges.length;
      if (outDegree > 0) {
        const share = (dampingFactor * ranks[j]) / outDegree;
        for (const target of outEdges) {
          newRanks[target] += share;
        }
      }
    }
    
    ranks = newRanks;
  }

  const result: Record<string, number> = {};
  pages.forEach((page, idx) => {
    result[page.url] = ranks[idx];
  });

  return result;
}
