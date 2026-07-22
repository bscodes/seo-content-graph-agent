import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PageNode, ClusterGroup, InternalLinkRecommendation } from '../../types';

interface GraphCanvasProps {
  pages: PageNode[];
  clusters: ClusterGroup[];
  recommendations: InternalLinkRecommendation[];
  selectedPageUrl: string | null;
  onSelectPage: (url: string | null) => void;
}

interface RenderNode {
  id: string;
  url: string;
  title: string;
  clusterId: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pageRank: number;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  pages,
  clusters,
  recommendations,
  selectedPageUrl,
  onSelectPage
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<RenderNode | null>(null);

  const nodes = useMemo(() => {
    const clusterColorMap: Record<string, string> = {};
    clusters.forEach(c => {
      clusterColorMap[c.id] = c.color;
    });

    const width = 800;
    const height = 600;

    return pages.map((page) => {
      const clusterIdx = clusters.findIndex(c => c.id === page.clusterId);
      const angle = (clusterIdx / (clusters.length || 1)) * 2 * Math.PI;
      const centerDist = Math.min(width, height) * 0.25;

      const centerX = width / 2 + Math.cos(angle) * centerDist;
      const centerY = height / 2 + Math.sin(angle) * centerDist;

      const randomOffsetX = (Math.random() - 0.5) * 120;
      const randomOffsetY = (Math.random() - 0.5) * 120;

      return {
        id: page.id,
        url: page.url,
        title: page.title,
        clusterId: page.clusterId || 'cluster-1',
        color: clusterColorMap[page.clusterId || ''] || '#10B981',
        x: centerX + randomOffsetX,
        y: centerY + randomOffsetY,
        vx: 0,
        vy: 0,
        radius: 8 + (page.pageRankScore || 0.1) * 35,
        pageRank: page.pageRankScore || 0.1
      };
    });
  }, [pages, clusters]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    // Adjust nodes to actual width/height if needed (simple translation)
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Cluster Orbit Guidelines
      clusters.forEach((cluster, cIdx) => {
        const angle = (cIdx / clusters.length) * 2 * Math.PI;
        const centerDist = Math.min(width, height) * 0.25;
        const cx = width / 2 + Math.cos(angle) * centerDist;
        const cy = height / 2 + Math.sin(angle) * centerDist;

        ctx.beginPath();
        ctx.arc(cx, cy, 75, 0, 2 * Math.PI);
        ctx.strokeStyle = `${cluster.color}15`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw Link Edges
      recommendations.forEach(rec => {
        const sourceNode = nodes.find(n => n.url === rec.sourceUrl);
        const targetNode = nodes.find(n => n.url === rec.targetUrl);

        if (sourceNode && targetNode) {
          const isSelected = selectedPageUrl === sourceNode.url || selectedPageUrl === targetNode.url;

          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);

          if (isSelected) {
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2.5;
          } else {
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + rec.relevanceScore * 0.15})`;
            ctx.lineWidth = 1;
          }
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        const isSelected = selectedPageUrl === node.url;
        const isHovered = hoveredNode?.url === node.url;

        // Outer Glow
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = `${node.color}33`;
          ctx.fill();
        }

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#FFF' : '#090C10';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node Label
        ctx.font = '11px "Inter", sans-serif';
        ctx.fillStyle = isSelected ? '#FFF' : '#9CA3AF';
        const label = node.title.length > 25 ? node.title.slice(0, 22) + '...' : node.title;
        ctx.fillText(label, node.x + node.radius + 6, node.y + 4);
      });
    };

    render();
    
    // No requestAnimationFrame loop - renders only when state changes.
  }, [nodes, clusters, recommendations, selectedPageUrl, hoveredNode]);

  // Mouse Interactions (handled outside the render loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const found = nodes.find(n => {
        const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
        return dist <= n.radius + 4;
      });

      setHoveredNode(found || null);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const found = nodes.find(n => {
        const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
        return dist <= n.radius + 4;
      });

      onSelectPage(found ? found.url : null);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [nodes, onSelectPage]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: hoveredNode ? 'pointer' : 'default' }} />
      {hoveredNode && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          background: '#11151C',
          border: '1px solid #1F2633',
          padding: '12px 16px',
          borderRadius: 8,
          pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', fontFamily: 'JetBrains Mono' }}>PAGE NODE</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F3F4F6', marginTop: 2 }}>{hoveredNode.title}</div>
          <div style={{ fontSize: '0.75rem', color: hoveredNode.color, marginTop: 4 }}>
            PageRank Centrality Score: <strong>{(hoveredNode.pageRank * 100).toFixed(1)}%</strong>
          </div>
        </div>
      )}
    </div>
  );
};
