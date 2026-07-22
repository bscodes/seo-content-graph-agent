import React, { useState } from 'react';
import { InternalLinkRecommendation } from '../../types';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { escapeHtml, ensureHttpsUrl } from '../../utils';

interface RecommendationsTableProps {
  recommendations: InternalLinkRecommendation[];
  selectedPageUrl: string | null;
  onSelectPage: (url: string | null) => void;
}

export const RecommendationsTable: React.FC<RecommendationsTableProps> = ({
  recommendations,
  selectedPageUrl,
  onSelectPage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = recommendations.filter(rec => {
    if (selectedPageUrl && rec.sourceUrl !== selectedPageUrl && rec.targetUrl !== selectedPageUrl) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rec.sourceTitle.toLowerCase().includes(q) ||
      rec.targetTitle.toLowerCase().includes(q) ||
      rec.suggestedAnchorText.toLowerCase().includes(q)
    );
  });

  const handleCopyTag = (rec: InternalLinkRecommendation) => {
    const safeTitle = escapeHtml(rec.targetTitle);
    const safeAnchor = escapeHtml(rec.suggestedAnchorText);
    const safeHref = escapeHtml(ensureHttpsUrl(rec.targetUrl));

    const htmlTag = `<a href="${safeHref}" title="${safeTitle}">${safeAnchor}</a>`;
    navigator.clipboard.writeText(htmlTag);
    setCopiedId(rec.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1F2633', background: '#090C10', display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Filter by page or keyword anchor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: '#11151C',
            border: '1px solid #1F2633',
            color: '#F3F4F6',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: '0.8rem',
            outline: 'none'
          }}
        />
        {selectedPageUrl && (
          <button
            className="btn btn-secondary"
            onClick={() => onSelectPage(null)}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            Clear Selection Filter
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Source Article</th>
              <th>Target & Anchor Text</th>
              <th>Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#6B7280' }}>
                  No internal link recommendations found for criteria.
                </td>
              </tr>
            ) : (
              filtered.map((rec) => (
                <tr key={rec.id} style={{ background: selectedPageUrl && (rec.sourceUrl === selectedPageUrl || rec.targetUrl === selectedPageUrl) ? 'rgba(16, 185, 129, 0.06)' : undefined }}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#F3F4F6', fontSize: '0.8rem' }}>{rec.sourceTitle}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                      {rec.sourceUrl.replace('https://', '')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#D1D5DB', fontSize: '0.8rem' }}>
                      ↳ {rec.targetTitle}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <span className="anchor-chip">"{rec.suggestedAnchorText}"</span>
                    </div>
                  </td>
                  <td>
                    <span className="score-badge">{(rec.relevanceScore * 100).toFixed(0)}%</span>
                  </td>
                  <td>
                    <button
                      className="btn-copy"
                      onClick={() => handleCopyTag(rec)}
                      title="Copy HTML link insertion tag"
                    >
                      {copiedId === rec.id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                      {copiedId === rec.id ? 'Copied!' : 'Copy <a/>'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
