import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { GraphCanvas } from './components/GraphCanvas';
import { RecommendationsTable } from './components/RecommendationsTable';
import { SEOContentGraphAgent } from '../agent';
import { SAMPLE_SITEMAP } from '../sampleData';
import { SitemapInput } from '../types';
import { Network, Layers, Link as LinkIcon, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [similarityThreshold, setSimilarityThreshold] = useState(0.65);
  const [sitemapData, setSitemapData] = useState<SitemapInput>(SAMPLE_SITEMAP);
  const [selectedPageUrl, setSelectedPageUrl] = useState<string | null>(null);
  const [customJsonInput, setCustomJsonInput] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  const [graphState, setGraphState] = useState<GraphState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Initialize and run Graph State Machine Agent
  useEffect(() => {
    let isMounted = true;
    setIsAnalyzing(true);
    
    // In browser, FakeEmbeddingProvider will be used as no process.env is injected.
    const agent = new SEOContentGraphAgent(undefined, similarityThreshold);
    agent.analyze(sitemapData)
      .then(state => {
        if (isMounted) {
          setGraphState(state);
          setIsAnalyzing(false);
        }
      })
      .catch(err => {
        console.error('Analysis failed:', err);
        if (isMounted) setIsAnalyzing(false);
      });
      
    return () => { isMounted = false; };
  }, [sitemapData, similarityThreshold]);

  const handleCustomUploadSubmit = () => {
    try {
      const parsed = JSON.parse(customJsonInput);
      if (parsed.pages && Array.isArray(parsed.pages)) {
        setSitemapData(parsed);
        setShowUploadModal(false);
        setCustomJsonInput('');
      } else {
        alert('Invalid format: JSON must contain a "pages" array.');
      }
    } catch (e: any) {
      alert(`JSON Parse Error: ${e.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header
        threshold={similarityThreshold}
        onThresholdChange={setSimilarityThreshold}
        onRunAnalysis={() => setSimilarityThreshold(prev => prev)}
        onUploadCustom={() => setShowUploadModal(true)}
      />

      {!graphState ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#9CA3AF' }}>
          <Sparkles size={32} style={{ marginBottom: 12, color: '#10B981', animation: 'pulse 2s infinite' }} />
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
            {isAnalyzing ? 'Initializing Graph State Machine & Fetching Embeddings...' : 'No data loaded.'}
          </div>
        </div>
      ) : (
        <>
          <div className="metrics-strip">
            <div className="metric-card">
              <div className="metric-label">Pages Ingested</div>
              <div className="metric-value">{graphState.metrics.totalPages}</div>
              <div className="metric-sub">Sitemap Normalized</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Semantic Clusters</div>
              <div className="metric-value">{graphState.metrics.clusterCount}</div>
              <div className="metric-sub"> cosine threshold &ge; {similarityThreshold}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Internal Link Edges</div>
              <div className="metric-value">{graphState.metrics.recommendedLinks}</div>
              <div className="metric-sub">{graphState.metrics.avgRelevanceScore * 100}% Avg Relevance</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">PageRank Efficiency</div>
              <div className="metric-value" style={{ color: '#10B981' }}>{graphState.metrics.pageRankDistributionGain}</div>
              <div className="metric-sub">Cluster Hub Channeling</div>
            </div>
          </div>

          <div className="cluster-legend">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', alignSelf: 'center', fontFamily: 'JetBrains Mono' }}>
              SEMANTIC CLUSTERS:
            </span>
            {graphState.clusters.map(cluster => (
              <div key={cluster.id} className="cluster-pill">
                <div className="cluster-dot" style={{ backgroundColor: cluster.color }} />
                <span>{cluster.name} ({cluster.pageUrls.length} pages)</span>
              </div>
            ))}
          </div>

          <div className="app-container">
            <div className="canvas-panel">
              <GraphCanvas
                pages={graphState.pages}
                clusters={graphState.clusters}
                recommendations={graphState.recommendations}
                selectedPageUrl={selectedPageUrl}
                onSelectPage={setSelectedPageUrl}
              />
            </div>

            <div className="sidebar-panel">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1F2633', background: '#090C10', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '0.85rem', fontWeight: 700, color: '#F3F4F6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LinkIcon size={14} color="#10B981" />
                  Internal Link Directives ({graphState.recommendations.length})
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: '#6B7280' }}>
                  Invariant: source &ne; target
                </span>
              </div>

              <RecommendationsTable
                recommendations={graphState.recommendations}
                selectedPageUrl={selectedPageUrl}
                onSelectPage={setSelectedPageUrl}
              />
            </div>
          </div>
        </>
      )}

      {/* Upload Custom JSON Sitemap Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: '#11151C',
            border: '1px solid #1F2633',
            borderRadius: 12,
            width: 540,
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.1rem', color: '#F3F4F6' }}>Upload Custom Sitemap JSON</h3>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: 4 }}>
              Paste your website sitemap JSON payload with `pages` array containing `url`, `title`, and `targetKeyword`.
            </p>
            <textarea
              rows={10}
              placeholder={`{\n  "pages": [\n    {\n      "url": "https://yoursite.com/post-1",\n      "title": "Your Post Title",\n      "targetKeyword": "keyword"\n    }\n  ]\n}`}
              value={customJsonInput}
              onChange={(e) => setCustomJsonInput(e.target.value)}
              style={{
                width: '100%',
                marginTop: 12,
                background: '#090C10',
                border: '1px solid #1F2633',
                color: '#F3F4F6',
                fontFamily: 'JetBrains Mono',
                fontSize: '0.8rem',
                padding: 12,
                borderRadius: 6,
                outline: 'none',
                resize: 'none'
              }}
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCustomUploadSubmit}>Parse & Run Graph Agent</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
