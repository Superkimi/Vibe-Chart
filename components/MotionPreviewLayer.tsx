"use client";

import { useMemo } from "react";
import { ViewportPortal } from "@xyflow/react";
import type { DiagramDocument } from "@/lib/diagram-schema";
import {
  edgePoints,
  graphBounds,
  motionFrameAt,
  nodeCenter,
  pointsToPath,
} from "@/lib/motion";

export function MotionPreviewLayer({
  diagram,
  progress,
}: {
  diagram: DiagramDocument;
  progress: number;
}) {
  const geometry = useMemo(
    () =>
      diagram.edges.map((edge) => ({
        edge,
        points: edgePoints(diagram, edge),
        path: pointsToPath(edgePoints(diagram, edge)),
      })),
    [diagram],
  );
  const bounds = useMemo(() => graphBounds(diagram), [diagram]);
  const frame = useMemo(() => motionFrameAt(diagram, progress), [diagram, progress]);
  const activeEdgeIds = new Set(frame.entry?.edgeIds ?? []);
  const activeNodeIds = new Set(frame.entry?.nodeIds ?? []);
  const activeEdge = geometry.find(({ edge }) => activeEdgeIds.has(edge.id));
  const token = activeEdge
    ? (() => {
        const points = activeEdge.points;
        const trail = Math.max(0, frame.progress - 0.22);
        const head = points.length ? points : [];
        return {
          head: head.length ? nodePoint(points, frame.progress) : null,
          trail: head.length ? nodePoint(points, trail) : null,
        };
      })()
    : { head: null, trail: null };
  const width = Math.max(1800, Math.ceil(bounds.x + bounds.width + 520));
  const height = Math.max(1200, Math.ceil(bounds.y + bounds.height + 420));

  return (
    <ViewportPortal>
      <svg
        className="motion-preview-layer"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <defs>
          <filter id="vibe-motion-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {geometry.map(({ edge, path }) => (
          <path
            key={`motion-base-${edge.id}`}
            d={path}
            className={`motion-edge ${activeEdgeIds.has(edge.id) ? "is-active" : ""}`}
          />
        ))}
        {token.trail && token.head ? (
          <path
            d={pointsToPath([token.trail, token.head])}
            className="motion-token-trail"
            filter="url(#vibe-motion-glow)"
          />
        ) : null}
        {token.head ? (
          <circle
            cx={token.head.x}
            cy={token.head.y}
            r="6"
            className="motion-token"
            filter="url(#vibe-motion-glow)"
          />
        ) : null}
        {diagram.nodes.map((node) => {
          if (!activeNodeIds.has(node.id)) return null;
          const center = nodeCenter(node);
          return (
            <circle
              key={`motion-node-${node.id}`}
              cx={center.x}
              cy={center.y}
              r="34"
              className="motion-node-pulse"
            />
          );
        })}
      </svg>
    </ViewportPortal>
  );
}

function nodePoint(points: Array<{ x: number; y: number }>, progress: number) {
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  const distances = points.slice(1).map((point, index) =>
    Math.hypot(point.x - points[index].x, point.y - points[index].y),
  );
  const total = distances.reduce((sum, value) => sum + value, 0);
  let remaining = total * Math.max(0, Math.min(1, progress));
  for (let index = 1; index < points.length; index += 1) {
    const length = distances[index - 1];
    if (remaining <= length) {
      const ratio = length === 0 ? 0 : remaining / length;
      return {
        x: points[index - 1].x + (points[index].x - points[index - 1].x) * ratio,
        y: points[index - 1].y + (points[index].y - points[index - 1].y) * ratio,
      };
    }
    remaining -= length;
  }
  return points.at(-1) ?? null;
}
