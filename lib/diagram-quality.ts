import type { DiagramDocument, VibeNode } from "./diagram-schema";

export type DiagramQualityIssue = {
  type: "overlap" | "edge_routing" | "layout";
  severity: "critical" | "warning";
  message: string;
  nodeIds?: string[];
  edgeId?: string;
};

const NODE_WIDTH = 206;
const NODE_HEIGHT = 86;
const ENTITY_HEIGHT = 142;
const GAP = 8;

function bounds(node: VibeNode) {
  return {
    left: node.position.x,
    top: node.position.y,
    right: node.position.x + NODE_WIDTH,
    bottom:
      node.position.y +
      (node.data.shape === "entity" ? ENTITY_HEIGHT : NODE_HEIGHT),
  };
}

function overlap(a: ReturnType<typeof bounds>, b: ReturnType<typeof bounds>) {
  return (
    a.left < b.right - GAP &&
    a.right > b.left + GAP &&
    a.top < b.bottom - GAP &&
    a.bottom > b.top + GAP
  );
}

function pointInside(point: { x: number; y: number }, rect: ReturnType<typeof bounds>) {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

function segmentsCross(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
) {
  const orientation = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    r: { x: number; y: number },
  ) => (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function segmentHitsRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  rect: ReturnType<typeof bounds>,
) {
  if (pointInside(start, rect) || pointInside(end, rect)) return true;
  const topLeft = { x: rect.left, y: rect.top };
  const topRight = { x: rect.right, y: rect.top };
  const bottomLeft = { x: rect.left, y: rect.bottom };
  const bottomRight = { x: rect.right, y: rect.bottom };
  return (
    segmentsCross(start, end, topLeft, topRight) ||
    segmentsCross(start, end, topRight, bottomRight) ||
    segmentsCross(start, end, bottomRight, bottomLeft) ||
    segmentsCross(start, end, bottomLeft, topLeft)
  );
}

export function assessDiagramQuality(
  diagram: DiagramDocument,
): DiagramQualityIssue[] {
  const issues: DiagramQualityIssue[] = [];
  const nodeBounds = new Map(diagram.nodes.map((node) => [node.id, bounds(node)]));

  for (let index = 0; index < diagram.nodes.length; index += 1) {
    for (let other = index + 1; other < diagram.nodes.length; other += 1) {
      const first = diagram.nodes[index];
      const second = diagram.nodes[other];
      if (overlap(nodeBounds.get(first.id)!, nodeBounds.get(second.id)!)) {
        issues.push({
          type: "overlap",
          severity: "critical",
          message: `Nodes ${first.id} and ${second.id} overlap.`,
          nodeIds: [first.id, second.id],
        });
      }
    }
  }

  const seenRoutes = new Set<string>();
  for (const edge of diagram.edges) {
    const source = diagram.nodes.find((node) => node.id === edge.source);
    const target = diagram.nodes.find((node) => node.id === edge.target);
    if (!source || !target) continue;
    const routeKey = `${edge.source}->${edge.target}`;
    if (seenRoutes.has(routeKey)) {
      issues.push({
        type: "edge_routing",
        severity: "warning",
        message: `Edges share the same ${routeKey} route.`,
        edgeId: edge.id,
      });
    }
    seenRoutes.add(routeKey);

    const sourceBounds = nodeBounds.get(source.id)!;
    const targetBounds = nodeBounds.get(target.id)!;
    const start = {
      x: (sourceBounds.left + sourceBounds.right) / 2,
      y: (sourceBounds.top + sourceBounds.bottom) / 2,
    };
    const end = {
      x: (targetBounds.left + targetBounds.right) / 2,
      y: (targetBounds.top + targetBounds.bottom) / 2,
    };
    const obstacle = diagram.nodes.find(
      (node) =>
        node.id !== source.id &&
        node.id !== target.id &&
        segmentHitsRect(start, end, nodeBounds.get(node.id)!),
    );
    if (obstacle) {
      issues.push({
        type: "edge_routing",
        severity: "warning",
        message: `Edge ${edge.id} crosses node ${obstacle.id}.`,
        edgeId: edge.id,
        nodeIds: [obstacle.id],
      });
    }
  }

  return issues;
}
