import { toMermaid } from "./diagram-code";
import {
  safeId,
  type DiagramDocument,
  type DiagramKind,
  type VibeEdge,
  type VibeNode,
} from "./diagram-schema";

export const krokiEngineIds = [
  "mermaid",
  "plantuml",
  "graphviz",
  "d2",
  "dbml",
] as const;

export type KrokiEngineId = (typeof krokiEngineIds)[number];
export type KrokiOutputFormat = "svg" | "png" | "jpeg" | "pdf" | "txt";

export type KrokiEngineDefinition = {
  id: KrokiEngineId;
  label: string;
  kinds: readonly DiagramKind[];
  formats: readonly KrokiOutputFormat[];
};

const graphKinds = [
  "architecture",
  "flowchart",
  "er",
  "sequence",
  "mindmap",
] as const satisfies readonly DiagramKind[];

export const krokiEngineDefinitions: readonly KrokiEngineDefinition[] = [
  {
    id: "mermaid",
    label: "Mermaid",
    kinds: graphKinds,
    formats: ["svg", "png"],
  },
  {
    id: "plantuml",
    label: "PlantUML",
    kinds: graphKinds,
    formats: ["svg", "png", "pdf", "txt"],
  },
  {
    id: "graphviz",
    label: "Graphviz",
    kinds: graphKinds,
    formats: ["svg", "png", "jpeg", "pdf"],
  },
  {
    id: "d2",
    label: "D2",
    kinds: graphKinds,
    formats: ["svg"],
  },
  {
    id: "dbml",
    label: "DBML",
    kinds: ["er"],
    formats: ["svg"],
  },
];

const definitionMap = new Map(
  krokiEngineDefinitions.map((definition) => [definition.id, definition]),
);

export function getKrokiEngineDefinition(engine: KrokiEngineId) {
  return definitionMap.get(engine)!;
}

export function isKrokiEngine(value: string): value is KrokiEngineId {
  return krokiEngineIds.includes(value as KrokiEngineId);
}

export function supportsKrokiEngine(
  diagram: DiagramDocument,
  engine: KrokiEngineId,
) {
  return getKrokiEngineDefinition(engine).kinds.includes(diagram.kind);
}

const quote = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");

const dotQuote = (value: string) =>
  quote(value).replace(/\|/g, "\\|").replace(/</g, "\\<").replace(/>/g, "\\>");

const cleanLabel = (value: string) =>
  value.replace(/[()[\]{}:]/g, " ").replace(/\s+/g, " ").trim();

const cleanMindMapLabel = (value: string) =>
  cleanLabel(value).replace(/[ *@]/g, " ").replace(/\s+/g, " ").trim();

function engineIds(diagram: DiagramDocument) {
  const used = new Set<string>();
  const ids = new Map<string, string>();
  for (const node of diagram.nodes) {
    const base = safeId(node.id);
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}_${suffix++}`;
    used.add(id);
    ids.set(node.id, id);
  }
  return ids;
}

function nodeLabel(node: VibeNode) {
  const fields = node.data.fields ?? [];
  return fields.length ? `${node.data.label}\\n${fields.join("\\n")}` : node.data.label;
}

function graphEdges(diagram: DiagramDocument, ids: Map<string, string>) {
  return diagram.edges
    .map((edge) => {
      const source = ids.get(edge.source);
      const target = ids.get(edge.target);
      if (!source || !target) return null;
      return { edge, source, target };
    })
    .filter((value): value is { edge: VibeEdge; source: string; target: string } => Boolean(value));
}

function graphvizShape(node: VibeNode) {
  switch (node.data.shape) {
    case "database":
    case "entity":
      return "cylinder";
    case "decision":
      return "diamond";
    case "external":
    case "actor":
      return "ellipse";
    default:
      return "box";
  }
}

export function toGraphviz(diagram: DiagramDocument) {
  const ids = engineIds(diagram);
  const lines = [
    "digraph VibeChart {",
    `  rankdir=${diagram.direction === "TB" ? "TB" : "LR"};`,
    "  graph [bgcolor=transparent, pad=0.25, nodesep=0.45, ranksep=0.7];",
    "  node [fontname=Arial, fontsize=12, style=filled, fillcolor=\"#eee9f8\", color=\"#6650a4\"];",
    "  edge [fontname=Arial, fontsize=10, color=\"#756b83\", arrowsize=0.7];",
  ];
  for (const node of diagram.nodes) {
    lines.push(
      `  ${ids.get(node.id)} [label=\"${dotQuote(nodeLabel(node))}\", shape=${graphvizShape(node)}];`,
    );
  }
  for (const { edge, source, target } of graphEdges(diagram, ids)) {
    const attributes = edge.label ? `label=\"${dotQuote(edge.label)}\"` : "";
    lines.push(
      `  ${source} -> ${target}${attributes ? ` [${attributes}]` : ""};`,
    );
  }
  lines.push("}");
  return lines.join("\n");
}

function plantumlNode(node: VibeNode, id: string) {
  const label = quote(node.data.label);
  switch (node.data.shape) {
    case "database":
    case "entity":
      return `database \"${label}\" as ${id}`;
    case "decision":
      return `rectangle \"${label}\" as ${id} <<decision>>`;
    case "external":
      return `cloud \"${label}\" as ${id}`;
    case "actor":
      return `actor \"${label}\" as ${id}`;
    default:
      return `rectangle \"${label}\" as ${id}`;
  }
}

function mindMapChildren(diagram: DiagramDocument) {
  const children = new Map<string, VibeEdge[]>();
  for (const edge of diagram.edges) {
    children.set(edge.source, [...(children.get(edge.source) ?? []), edge]);
  }
  return children;
}

function plantumlMindMap(diagram: DiagramDocument, ids: Map<string, string>) {
  const rootId = diagram.mindmap?.rootId ?? diagram.nodes[0]?.id;
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const children = mindMapChildren(diagram);
  const lines = ["@startmindmap"];
  const visited = new Set<string>();

  const visit = (id: string, depth: number) => {
    const node = byId.get(id);
    if (!node || visited.has(id)) return;
    visited.add(id);
    lines.push(
      `${"*".repeat(Math.max(1, depth))} ${cleanMindMapLabel(node.data.label)}`,
    );
    for (const edge of children.get(id) ?? []) visit(edge.target, depth + 1);
  };

  if (rootId) visit(rootId, 1);
  for (const node of diagram.nodes) {
    if (!visited.has(node.id)) visit(node.id, 2);
  }
  // Keep ids referenced in generated diagnostics, while PlantUML itself uses labels.
  void ids;
  lines.push("@endmindmap");
  return lines;
}

function plantumlEr(diagram: DiagramDocument, ids: Map<string, string>) {
  const lines = ["@startuml", "hide circle", "skinparam linetype ortho"];
  for (const node of diagram.nodes) {
    lines.push(`entity \"${quote(node.data.label)}\" as ${ids.get(node.id)} {`);
    const fields = node.data.fields?.length ? node.data.fields : ["string id"];
    for (const field of fields) {
      const [type = "string", name = "field"] = field.split(/\s+/);
      lines.push(`  * ${quote(name)} : ${quote(type)}`);
    }
    lines.push("}");
  }
  for (const { edge, source, target } of graphEdges(diagram, ids)) {
    lines.push(`${source} ||--o{ ${target} : ${quote(edge.label || "relates")}`);
  }
  lines.push("@enduml");
  return lines;
}

export function toPlantUml(diagram: DiagramDocument) {
  const ids = engineIds(diagram);
  if (diagram.kind === "mindmap") return plantumlMindMap(diagram, ids).join("\n");
  if (diagram.kind === "er") return plantumlEr(diagram, ids).join("\n");
  const lines = ["@startuml", diagram.direction === "TB" ? "top to bottom direction" : "left to right direction"];
  if (diagram.kind === "sequence") {
    for (const node of diagram.nodes) {
      lines.push(`participant \"${quote(node.data.label)}\" as ${ids.get(node.id)}`);
    }
    for (const { edge, source, target } of graphEdges(diagram, ids)) {
      lines.push(`${source} -> ${target} : ${quote(edge.label || "message")}`);
    }
  } else {
    for (const node of diagram.nodes) lines.push(plantumlNode(node, ids.get(node.id)!));
    for (const { edge, source, target } of graphEdges(diagram, ids)) {
      lines.push(`${source} --> ${target} : ${quote(edge.label || "")}`.trim());
    }
  }
  lines.push("@enduml");
  return lines.join("\n");
}

export function toD2(diagram: DiagramDocument) {
  const ids = engineIds(diagram);
  const lines = [`direction: ${diagram.direction === "TB" ? "down" : "right"}`];
  for (const node of diagram.nodes) {
    const id = ids.get(node.id)!;
    lines.push(`${id}: \"${quote(nodeLabel(node))}\"`);
    if (node.data.shape === "database" || node.data.shape === "entity") {
      lines.push(`${id}.shape: cylinder`);
    } else if (node.data.shape === "decision") {
      lines.push(`${id}.shape: diamond`);
    } else if (node.data.shape === "external") {
      lines.push(`${id}.shape: cloud`);
    }
  }
  for (const { edge, source, target } of graphEdges(diagram, ids)) {
    lines.push(`${source} -> ${target}${edge.label ? `: \"${quote(edge.label)}\"` : ""}`);
  }
  return lines.join("\n");
}

function dbmlField(field: string) {
  const [type = "string", name = "field", ...constraints] = field.split(/\s+/);
  const modifiers = constraints
    .filter((constraint) => ["pk", "not_null", "unique"].includes(constraint.toLowerCase()))
    .map((constraint) => constraint.toLowerCase())
    .join(", ");
  return `  ${safeId(name)} ${safeId(type, "string")}${modifiers ? ` [${modifiers}]` : ""}`;
}

export function toDbml(diagram: DiagramDocument) {
  if (diagram.kind !== "er") {
    throw new Error("DBML rendering is available for ER diagrams only.");
  }
  const ids = engineIds(diagram);
  const lines: string[] = [];
  for (const node of diagram.nodes) {
    lines.push(`Table ${ids.get(node.id)} {`);
    const fields = node.data.fields?.length ? node.data.fields : ["string id pk"];
    lines.push(...fields.map(dbmlField));
    lines.push("}", "");
  }
  for (const { source, target } of graphEdges(diagram, ids)) {
    lines.push(`Ref: ${source}.id > ${target}.id`);
  }
  return lines.join("\n").trim();
}

export function toKrokiSource(diagram: DiagramDocument, engine: KrokiEngineId) {
  if (!supportsKrokiEngine(diagram, engine)) {
    throw new Error(`${engine} does not support ${diagram.kind} diagrams.`);
  }
  switch (engine) {
    case "mermaid":
      return toMermaid(diagram);
    case "plantuml":
      return toPlantUml(diagram);
    case "graphviz":
      return toGraphviz(diagram);
    case "d2":
      return toD2(diagram);
    case "dbml":
      return toDbml(diagram);
  }
}
