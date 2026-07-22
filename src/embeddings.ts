import { PageNode } from './types.js';

// Deterministic TF-IDF / Semantic Hashing Embedder
export function generateEmbedding(text: string, dimensions = 64): number[] {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
  const tokens = normalized.split(/\s+/).filter(t => t.length > 2);
  
  const vector = new Array(dimensions).fill(0);
  if (tokens.length === 0) return vector;

  tokens.forEach((token, idx) => {
    // Hash token into dimensions space
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const dim = Math.abs(hash) % dimensions;
    const weight = 1 + (idx === 0 ? 0.5 : 0); // Give higher weight to lead keyword terms
    vector[dim] += weight;
  });

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  
  return vector.map(val => val / magnitude);
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

// PageRank Centrality Calculator over similarity adjacency matrix
export function computePageRankCentrality(
  pages: PageNode[],
  similarityMatrix: number[][],
  iterations = 20,
  dampingFactor = 0.85
): Record<string, number> {
  const N = pages.length;
  if (N === 0) return {};

  let ranks: number[] = new Array(N).fill(1 / N);

  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Array(N).fill((1 - dampingFactor) / N);
    
    for (let i = 0; i < N; i++) {
      let degreeSum = 0;
      for (let j = 0; j < N; j++) {
        if (i !== j) degreeSum += similarityMatrix[j][i];
      }

      if (degreeSum > 0) {
        for (let j = 0; j < N; j++) {
          if (i !== j && similarityMatrix[j][i] > 0) {
            newRanks[i] += dampingFactor * ranks[j] * (similarityMatrix[j][i] / degreeSum);
          }
        }
      }
    }
    ranks = newRanks;
  }

  const result: Record<string, number> = {};
  pages.forEach((page, idx) => {
    result[page.url] = parseFloat(ranks[idx].toFixed(4));
  });

  return result;
}
