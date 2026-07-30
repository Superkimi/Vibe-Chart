import type {
  DiagramDocument,
  NodeShape,
  VibeEdge,
  VibeNode,
} from "./diagram-schema";
import { safeId, validateDiagram } from "./diagram-schema";

const escapeMermaid = (value: string) =>
  value.replace(/"/g, "'").replace(/\r?\n/g, " ");

const nodeSyntax = (node: VibeNode) => {
  const label = escapeMermaid(node.data.label);
  switch (node.data.shape) {
    case "decision":
      return `${node.id}{"${label}"}`;
    case "database":
      return `${node.id}[("${label}")]`;
    case "external":
    case "actor":
      return `${node.id}(("${label}"))`;
    default:
      return `${node.id}["${label}"]`;
  }
};

function erMermaid(diagram: DiagramDocument) {
  const lines = ["erDiagram"];
  const labels = new Map<string, string>();
  for (const node of diagram.nodes) {
    const entityName = safeId(node.id);
    labels.set(node.id, entityName);
    lines.push(
      `  ${entityName}["${escapeMermaid(node.data.label)}"] {`,
    );
    for (const field of node.data.fields ?? []) {
      const [type = "string", name = "field", ...constraints] = field.split(/\s+/);
      lines.push(`    ${type} ${safeId(name)}${constraints.length ? ` ${constraints.join(" ")}` : ""}`);
    }
    lines.push("  }");
  }
  for (const edge of diagram.edges) {
    lines.push(
      `  ${labels.get(edge.source)} ||--o{ ${labels.get(edge.target)} : "${escapeMermaid(edge.label ?? "relates")}"`,
    );
  }
  return lines.join("\n");
}

function sequenceMermaid(diagram: DiagramDocument) {
  const lines = ["sequenceDiagram"];
  for (const node of diagram.nodes) {
    lines.push(`  participant ${node.id} as ${escapeMermaid(node.data.label)}`);
  }
  for (const edge of diagram.edges) {
    lines.push(
      `  ${edge.source}->>${edge.target}: ${escapeMermaid(edge.label ?? "message")}`,
    );
  }
  return lines.join("\n");
}

export function toMermaid(diagram: DiagramDocument) {
  if (diagram.kind === "er") return erMermaid(diagram);
  if (diagram.kind === "sequence") return sequenceMermaid(diagram);

  const lines = [`flowchart ${diagram.direction}`];
  diagram.nodes.forEach((node) => lines.push(`  ${nodeSyntax(node)}`));
  diagram.edges.forEach((edge) => {
    const label = edge.label ? `|${escapeMermaid(edge.label)}|` : "";
    lines.push(`  ${edge.source} -->${label} ${edge.target}`);
  });
  return lines.join("\n");
}

const shapeFromToken = (token: string): NodeShape => {
  if (token.includes("{")) return "decision";
  if (token.includes("[(")) return "database";
  if (token.includes("((")) return "external";
  return "process";
};

const cleanLabel = (value: string) =>
  value
    .replace(/^[\[({]+["']?/, "")
    .replace(/["']?[\])}]+$/, "")
    .trim();

const makeNode = (
  id: string,
  label: string,
  shape: NodeShape,
  index: number,
  prior?: VibeNode,
  fields: string[] = [],
): VibeNode => ({
  ...(prior ?? {
    id,
    type: "vibeNode" as const,
    position: {
      x: (index % 4) * 260 + 80,
      y: Math.floor(index / 4) * 190 + 80,
    },
    data: {
      label,
      subtitle: "",
      shape,
      tone: shape === "entity" || shape === "database" ? "cyan" : "lilac",
      fields,
    },
  }),
  id,
  data: {
    ...(prior?.data ?? {}),
    label,
    shape,
    fields,
    subtitle: prior?.data.subtitle ?? "",
    tone:
      prior?.data.tone ??
      (shape === "entity" || shape === "database" ? "cyan" : "lilac"),
  },
});

function matchingEdge(
  current: DiagramDocument,
  source: string,
  target: string,
  index: number,
  usedIds: Set<string>,
) {
  const existing = current.edges.find(
    (edge) =>
      edge.source === source &&
      edge.target === target &&
      !usedIds.has(edge.id),
  )?.id;
  const id = existing ?? `edge-${source}-${target}-${index}`;
  usedIds.add(id);
  return id;
}

function fromErMermaid(lines: string[], current: DiagramDocument) {
  const oldNodes = new Map(current.nodes.map((node) => [node.id, node]));
  const nodes = new Map<string, VibeNode>();
  const edges: VibeEdge[] = [];
  const usedEdgeIds = new Set<string>();
  let active:
    | { id: string; label: string; fields: string[] }
    | undefined;

  const commitEntity = () => {
    if (!active) return;
    nodes.set(
      active.id,
      makeNode(
        active.id,
        active.label,
        "entity",
        nodes.size,
        oldNodes.get(active.id),
        active.fields,
      ),
    );
    active = undefined;
  };

  const ensureEntity = (id: string) => {
    if (nodes.has(id)) return;
    const prior = oldNodes.get(id);
    nodes.set(
      id,
      makeNode(
        id,
        prior?.data.label ?? id,
        "entity",
        nodes.size,
        prior,
        prior?.data.fields ?? [],
      ),
    );
  };

  for (const line of lines.slice(1)) {
    const entity = /^([A-Za-z][\w-]*)(?:\[(?:"([^"]+)"|([^\]]+))\])?\s*\{$/.exec(
      line,
    );
    if (entity) {
      commitEntity();
      active = {
        id: entity[1],
        label: entity[2] ?? entity[3] ?? entity[1],
        fields: [],
      };
      continue;
    }
    if (line === "}") {
      commitEntity();
      continue;
    }
    if (active) {
      active.fields.push(line);
      continue;
    }
    const relation =
      /^([A-Za-z][\w-]*)\s+(\S+)\s+([A-Za-z][\w-]*)\s*:\s*"?([^"]*)"?$/.exec(
        line,
      );
    if (relation) {
      ensureEntity(relation[1]);
      ensureEntity(relation[3]);
      edges.push({
        id: matchingEdge(
          current,
          relation[1],
          relation[3],
          edges.length,
          usedEdgeIds,
        ),
        source: relation[1],
        target: relation[3],
        label: relation[4],
        type: "smoothstep",
        animated: false,
      });
    }
  }
  commitEntity();
  if (!nodes.size) throw new Error("No compatible Mermaid entities were found.");
  return validateDiagram({
    ...current,
    kind: "er",
    direction: "LR",
    nodes: [...nodes.values()],
    edges,
    updatedAt: new Date().toISOString(),
  });
}

function fromSequenceMermaid(lines: string[], current: DiagramDocument) {
  const oldNodes = new Map(current.nodes.map((node) => [node.id, node]));
  const declaredShapes = new Map<string, NodeShape>();
  const nodes = new Map<string, VibeNode>();
  const edges: VibeEdge[] = [];
  const usedEdgeIds = new Set<string>();

  const ensureParticipant = (
    id: string,
    label = id,
    shape = declaredShapes.get(id) ?? "service",
  ) => {
    if (nodes.has(id)) return;
    declaredShapes.set(id, shape);
    nodes.set(
      id,
      makeNode(id, label, shape, nodes.size, oldNodes.get(id)),
    );
  };

  for (const line of lines.slice(1)) {
    const participant =
      /^(participant|actor)\s+([A-Za-z][\w-]*)(?:\s+as\s+(.+))?$/.exec(line);
    if (participant) {
      ensureParticipant(
        participant[2],
        participant[3]?.trim() || participant[2],
        participant[1] === "actor" ? "actor" : "service",
      );
      continue;
    }
    const message =
      /^([A-Za-z][\w-]*)\s*(-->>|->>|-->|->|-\)|--\))\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(
        line,
      );
    if (message) {
      ensureParticipant(message[1]);
      ensureParticipant(message[3]);
      edges.push({
        id: matchingEdge(
          current,
          message[1],
          message[3],
          edges.length,
          usedEdgeIds,
        ),
        source: message[1],
        target: message[3],
        label: message[4].trim(),
        type: "straight",
        animated: true,
      });
    }
  }
  if (!nodes.size) {
    throw new Error("No compatible Mermaid participants were found.");
  }
  return validateDiagram({
    ...current,
    kind: "sequence",
    direction: "LR",
    nodes: [...nodes.values()],
    edges,
    updatedAt: new Date().toISOString(),
  });
}

export function fromMermaid(
  source: string,
  current: DiagramDocument,
): DiagramDocument {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));
  if (!lines.length) throw new Error("Mermaid source is empty.");
  if (/^erDiagram\b/.test(lines[0])) {
    return fromErMermaid(lines, current);
  }
  if (/^sequenceDiagram\b/.test(lines[0])) {
    return fromSequenceMermaid(lines, current);
  }
  if (!/^flowchart|^graph/.test(lines[0])) {
    throw new Error("Use flowchart, erDiagram, or sequenceDiagram syntax.");
  }

  const direction = /\b(TB|TD|LR|RL|BT)\b/.exec(lines[0])?.[1];
  const nodes = new Map<string, VibeNode>();
  const edges: VibeEdge[] = [];
  const oldNodes = new Map(current.nodes.map((node) => [node.id, node]));
  let row = 0;

  const ensureNode = (id: string, token?: string) => {
    if (nodes.has(id)) return;
    const prior = oldNodes.get(id);
    nodes.set(
      id,
      prior
        ? {
            ...prior,
            data: token
              ? {
                  ...prior.data,
                  label: cleanLabel(token),
                  shape: shapeFromToken(token),
                }
              : prior.data,
          }
        : {
            id,
            type: "vibeNode",
            position: {
              x: (row % 3) * 280 + 80,
              y: Math.floor(row / 3) * 180 + 80,
            },
            data: {
              label: token ? cleanLabel(token) : id,
              subtitle: "",
              shape: token ? shapeFromToken(token) : "process",
              tone: "lilac",
              fields: [],
            },
          },
    );
    row += 1;
  };

  const edgePattern =
    /^([A-Za-z][\w-]*)(\[[^\n]+\]|\([^\n]+\)|\{[^\n]+\})?\s*-->\s*(?:\|([^|]+)\|\s*)?([A-Za-z][\w-]*)(\[[^\n]+\]|\([^\n]+\)|\{[^\n]+\})?/;
  const nodePattern =
    /^([A-Za-z][\w-]*)(\[[^\n]+\]|\([^\n]+\)|\{[^\n]+\})$/;

  for (const line of lines.slice(1)) {
    const edge = edgePattern.exec(line);
    if (edge) {
      ensureNode(edge[1], edge[2]);
      ensureNode(edge[4], edge[5]);
      edges.push({
        id: `edge-${edge[1]}-${edge[4]}-${edges.length}`,
        source: edge[1],
        target: edge[4],
        label: edge[3] ?? "",
        type: "smoothstep",
        animated: false,
      });
      continue;
    }
    const node = nodePattern.exec(line);
    if (node) ensureNode(node[1], node[2]);
  }

  if (!nodes.size) throw new Error("No compatible Mermaid nodes were found.");
  return validateDiagram({
    ...current,
    direction: direction === "TB" || direction === "TD" ? "TB" : "LR",
    nodes: [...nodes.values()],
    edges,
    updatedAt: new Date().toISOString(),
  });
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const drawioStyle = (shape: NodeShape) => {
  const shared =
    "whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=13;rounded=1;";
  if (shape === "decision") return `${shared}rhombus;`;
  if (shape === "database") return `${shared}shape=cylinder3;boundedLbl=1;`;
  if (shape === "external" || shape === "actor")
    return `${shared}ellipse;aspect=fixed;`;
  return shared;
};

export function toDrawio(diagram: DiagramDocument) {
  const cells = diagram.nodes
    .map(
      (node) =>
        `<mxCell id="${escapeXml(node.id)}" value="${escapeXml(node.data.label)}" style="${drawioStyle(node.data.shape)}" vertex="1" parent="1"><mxGeometry x="${Math.round(node.position.x)}" y="${Math.round(node.position.y)}" width="190" height="${node.data.shape === "entity" ? 120 : 72}" as="geometry"/></mxCell>`,
    )
    .join("");
  const edges = diagram.edges
    .map(
      (edge) =>
        `<mxCell id="${escapeXml(edge.id)}" value="${escapeXml(edge.label ?? "")}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;" edge="1" parent="1" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    )
    .join("");
  const model = `<mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}${edges}</root></mxGraphModel>`;
  return `<mxfile host="Vibe Chart" modified="${new Date().toISOString()}" agent="Vibe Chart" version="1.0"><diagram id="${escapeXml(diagram.id)}" name="${escapeXml(diagram.title)}">${model}</diagram></mxfile>`;
}

export function downloadText(
  contents: string,
  fileName: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
