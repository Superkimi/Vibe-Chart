import dagre from "@dagrejs/dagre";
import type { DiagramDocument } from "./diagram-schema";

const NODE_WIDTH = 206;
const NODE_HEIGHT = 86;

export function layoutDiagram(
  diagram: DiagramDocument,
  direction = diagram.direction,
): DiagramDocument {
  if (diagram.kind === "whiteboard") return diagram;
  if (diagram.kind === "mindmap") return layoutMindMap(diagram);

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    ranksep: 100,
    nodesep: 60,
    edgesep: 28,
    marginx: 50,
    marginy: 50,
  });

  diagram.nodes.forEach((node) =>
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: node.data.shape === "entity" ? 142 : NODE_HEIGHT,
    }),
  );
  diagram.edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  return {
    ...diagram,
    direction,
    updatedAt: new Date().toISOString(),
    nodes: diagram.nodes.map((node) => {
      const placed = graph.node(node.id);
      return {
        ...node,
        position: {
          x: placed.x - NODE_WIDTH / 2,
          y:
            placed.y -
            (node.data.shape === "entity" ? 142 : NODE_HEIGHT) / 2,
        },
      };
    }),
  };
}

/**
 * Mind maps are not ordinary rank graphs: a readable tree keeps the root
 * stable and spaces siblings by their visible order.  This deterministic
 * layout also makes AI-generated branches land in a predictable place.
 */
export function layoutMindMap(diagram: DiagramDocument): DiagramDocument {
  const rootId = diagram.mindmap?.rootId ?? diagram.nodes[0]?.id;
  if (!rootId) return diagram;

  const children = new Map<string, string[]>();
  diagram.nodes.forEach((node) => children.set(node.id, []));
  diagram.edges.forEach((edge) => {
    const list = children.get(edge.source);
    if (list && children.has(edge.target) && !list.includes(edge.target)) {
      list.push(edge.target);
    }
  });

  const levels = new Map<string, number>();
  const order: string[] = [];
  const queue = [rootId];
  levels.set(rootId, 0);
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const child of children.get(id) ?? []) {
      if (levels.has(child)) continue;
      levels.set(child, (levels.get(id) ?? 0) + 1);
      queue.push(child);
    }
  }
  diagram.nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 1);
      order.push(node.id);
    }
  });

  const positions = new Map<string, { x: number; y: number }>();
  if (diagram.mindmap?.layout === "radial") {
    positions.set(rootId, { x: 430, y: 310 });
    const maxDepth = Math.max(...[...levels.values()]);
    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const ids = order.filter((id) => levels.get(id) === depth);
      const radius = 220 + depth * 170;
      ids.forEach((id, index) => {
        const angle = (index / Math.max(1, ids.length)) * Math.PI * 2 - Math.PI / 2;
        positions.set(id, {
          x: 430 + Math.cos(angle) * radius,
          y: 310 + Math.sin(angle) * radius,
        });
      });
    }
  } else {
    const rows = new Map<number, string[]>();
    order.forEach((id) => {
      const level = levels.get(id) ?? 0;
      rows.set(level, [...(rows.get(level) ?? []), id]);
    });
    for (const [level, ids] of rows) {
      const x = level === 0 ? 80 : 80 + level * 290;
      const spacing = 150;
      const offset = Math.max(40, 300 - ((ids.length - 1) * spacing) / 2);
      ids.forEach((id, index) => {
        positions.set(id, { x, y: offset + index * spacing });
      });
    }
  }

  return {
    ...diagram,
    direction: "LR",
    updatedAt: new Date().toISOString(),
    nodes: diagram.nodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? node.position,
    })),
  };
}
