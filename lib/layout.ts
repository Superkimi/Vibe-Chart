import dagre from "@dagrejs/dagre";
import type { DiagramDocument } from "./diagram-schema";

const NODE_WIDTH = 206;
const NODE_HEIGHT = 86;

export function layoutDiagram(
  diagram: DiagramDocument,
  direction = diagram.direction,
): DiagramDocument {
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

