import type { DiagramDocument, DiagramKind, NodeShape } from "./diagram-schema";

type SeedNode = [
  id: string,
  label: string,
  subtitle: string,
  shape: NodeShape,
  x: number,
  y: number,
  fields?: string[],
];

function makeDocument(
  id: string,
  title: string,
  kind: DiagramKind,
  nodes: SeedNode[],
  edges: Array<[string, string, string, string]>,
): DiagramDocument {
  return {
    id,
    title,
    kind,
    direction: "LR",
    revision: 0,
    updatedAt: new Date().toISOString(),
    nodes: nodes.map(([nodeId, label, subtitle, shape, x, y, fields]) => ({
      id: nodeId,
      type: "vibeNode",
      position: { x, y },
      data: {
        label,
        subtitle,
        shape,
        tone:
          shape === "database"
            ? "cyan"
            : shape === "external"
              ? "slate"
              : "lilac",
        fields: fields ?? [],
      },
    })),
    edges: edges.map(([edgeId, source, target, label]) => ({
      id: edgeId,
      source,
      target,
      label,
      type: "smoothstep",
      animated: false,
    })),
  };
}

export const starterDocuments: DiagramDocument[] = [
  makeDocument(
    "commerce-platform",
    "AI Commerce Platform",
    "architecture",
    [
      ["client", "Web & Mobile", "Customer experience", "external", 30, 130],
      ["gateway", "API Gateway", "Auth, routing, limits", "service", 290, 130],
      ["catalog", "Catalog Service", "Products and pricing", "service", 560, 45],
      ["orders", "Order Service", "Checkout orchestration", "service", 560, 215],
      ["events", "Event Stream", "Durable domain events", "process", 835, 130],
      ["postgres", "PostgreSQL", "Transactional store", "database", 1080, 45],
      ["warehouse", "Analytics Lake", "BI and model features", "database", 1080, 215],
    ],
    [
      ["e1", "client", "gateway", "HTTPS"],
      ["e2", "gateway", "catalog", "query"],
      ["e3", "gateway", "orders", "command"],
      ["e4", "catalog", "events", "publish"],
      ["e5", "orders", "events", "publish"],
      ["e6", "events", "postgres", "persist"],
      ["e7", "events", "warehouse", "stream"],
    ],
  ),
  makeDocument(
    "incident-triage",
    "Incident Triage",
    "flowchart",
    [
      ["alert", "Alert received", "Pager or customer report", "process", 30, 120],
      ["impact", "Customer impact?", "Check SLO and blast radius", "decision", 300, 120],
      ["observe", "Collect evidence", "Logs, metrics, traces", "process", 590, 30],
      ["mitigate", "Mitigate", "Rollback or isolate", "process", 590, 210],
      ["resolve", "Verify recovery", "SLO returns to target", "process", 870, 120],
    ],
    [
      ["f1", "alert", "impact", "triage"],
      ["f2", "impact", "observe", "no"],
      ["f3", "impact", "mitigate", "yes"],
      ["f4", "observe", "resolve", "fix"],
      ["f5", "mitigate", "resolve", "verify"],
    ],
  ),
  makeDocument(
    "commerce-er",
    "Commerce Data Model",
    "er",
    [
      ["user", "USER", "Account", "entity", 70, 80, ["uuid id PK", "string email UK", "datetime created_at"]],
      ["order", "ORDER", "Purchase", "entity", 420, 80, ["uuid id PK", "uuid user_id FK", "decimal total"]],
      ["line_item", "LINE_ITEM", "Order detail", "entity", 770, 80, ["uuid id PK", "uuid order_id FK", "uuid product_id FK", "int quantity"]],
      ["product", "PRODUCT", "Catalog item", "entity", 770, 300, ["uuid id PK", "string sku UK", "decimal price"]],
    ],
    [
      ["r1", "user", "order", "places"],
      ["r2", "order", "line_item", "contains"],
      ["r3", "product", "line_item", "referenced by"],
    ],
  ),
];

export const blankDocument = (kind: DiagramKind = "flowchart"): DiagramDocument =>
  makeDocument(
    `diagram-${Date.now()}`,
    kind === "er" ? "Untitled ER diagram" : "Untitled diagram",
    kind,
    [["start", kind === "er" ? "ENTITY" : "Start here", "Double-click to rename", kind === "er" ? "entity" : "process", 120, 100, kind === "er" ? ["uuid id PK"] : []]],
    [],
  );
