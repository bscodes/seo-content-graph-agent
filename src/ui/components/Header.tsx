import React from 'react';
import { Network, Play, RefreshCw, Upload, FileText } from 'lucide-react';

interface HeaderProps {
  threshold: number;
  onThresholdChange: (val: number) => void;
  onRunAnalysis: () => void;
  onUploadCustom: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  threshold,
  onThresholdChange,
  onRunAnalysis,
  onUploadCustom
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Network size={20} />
        </div>
        <div>
          <span className="brand-title">SEO Content Graph Agent</span>
          <span className="brand-tag" style={{ marginLeft: 8 }}>v1.0.0</span>
        </div>
      </div>

      <div className="header-controls">
        <div className="control-group">
          <label>Similarity Threshold: <strong>{threshold.toFixed(2)}</strong></label>
          <input
            type="range"
            min="0.30"
            max="0.90"
            step="0.05"
            value={threshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="slider-input"
          />
        </div>

        <button className="btn btn-secondary" onClick={onUploadCustom}>
          <Upload size={14} />
          Upload JSON Inventory
        </button>

        <button className="btn btn-primary" onClick={onRunAnalysis}>
          <Play size={14} />
          Re-Analyze Graph
        </button>
      </div>
    </header>
  );
};
