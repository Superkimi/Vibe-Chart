import type {
  DiagramDocument,
  DiagramKind,
  NodeShape,
  WhiteboardElement,
} from "./diagram-schema";

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
    schemaVersion: 2,
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
    motion: {
      enabled: true,
      mode: "trace",
      durationMs: 4800,
      loop: false,
      steps: [],
    },
  };
}

function makeMindMapDocument(
  id: string,
  title: string,
  root: SeedNode,
  branches: SeedNode[],
  edges: Array<[string, string, string, string]>,
): DiagramDocument {
  return {
    ...makeDocument(id, title, "mindmap", [root, ...branches], edges),
    direction: "LR",
    mindmap: { rootId: root[0], layout: "right" },
  };
}

function makeWhiteboardDocument(
  id: string,
  title: string,
  elements: WhiteboardElement[],
): DiagramDocument {
  return {
    schemaVersion: 2,
    id,
    title,
    kind: "whiteboard",
    direction: "LR",
    revision: 0,
    nodes: [],
    edges: [],
    whiteboard: { elements },
    motion: {
      enabled: false,
      mode: "trace",
      durationMs: 4800,
      loop: false,
      steps: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

const whiteboardElement = (
  element: Omit<WhiteboardElement, "rotation"> & { rotation?: number },
): WhiteboardElement => ({ rotation: 0, ...element });

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
  makeDocument(
    "checkout-sequence",
    "Checkout Message Sequence",
    "sequence",
    [
      ["customer", "Customer", "Browser or app", "actor", 50, 90],
      ["checkout", "Checkout API", "Order boundary", "service", 330, 90],
      ["payments", "Payment Provider", "External processor", "external", 610, 90],
      ["orders-db", "Orders DB", "Durable state", "database", 890, 90],
    ],
    [
      ["s1", "customer", "checkout", "submit order"],
      ["s2", "checkout", "payments", "authorize"],
      ["s3", "payments", "checkout", "approved"],
      ["s4", "checkout", "orders-db", "persist order"],
    ],
  ),
  makeMindMapDocument(
    "product-mindmap",
    "Product Strategy Mind Map",
    ["product-root", "Product strategy", "Outcome and focus", "service", 80, 250],
    [
      ["product-users", "Users", "Who we serve", "actor", 380, 60],
      ["product-problem", "Problem", "Pain worth solving", "decision", 380, 220],
      ["product-solution", "Solution", "Smallest useful bet", "process", 380, 380],
      ["product-research", "Research", "Evidence and feedback", "process", 700, 60],
      ["product-metrics", "Metrics", "Signals of success", "database", 700, 380],
    ],
    [
      ["m1", "product-root", "product-users", "for"],
      ["m2", "product-root", "product-problem", "solves"],
      ["m3", "product-root", "product-solution", "ships"],
      ["m4", "product-users", "product-research", "learn"],
      ["m5", "product-solution", "product-metrics", "measure"],
    ],
  ),
  makeMindMapDocument(
    "roadmap-mindmap",
    "Quarterly Roadmap",
    ["roadmap-root", "Q3 roadmap", "Themes and bets", "service", 80, 250],
    [
      ["roadmap-now", "Now", "Commit this month", "process", 380, 80],
      ["roadmap-next", "Next", "Prepare the next sprint", "process", 380, 240],
      ["roadmap-later", "Later", "Keep discovery open", "process", 380, 400],
    ],
    [
      ["rmap1", "roadmap-root", "roadmap-now", "focus"],
      ["rmap2", "roadmap-root", "roadmap-next", "sequence"],
      ["rmap3", "roadmap-root", "roadmap-later", "explore"],
    ],
  ),
  makeWhiteboardDocument("brainstorm-whiteboard", "Product Brainstorm", [
    whiteboardElement({
      id: "wb-title",
      type: "sticky",
      position: { x: 110, y: 100 },
      size: { width: 260, height: 120 },
      text: "Start with the user problem",
      tone: "amber",
    }),
    whiteboardElement({
      id: "wb-note",
      type: "text",
      position: { x: 430, y: 135 },
      size: { width: 300, height: 80 },
      text: "Use this board for loose ideas, sketches, and workshop notes.",
      tone: "slate",
    }),
    whiteboardElement({
      id: "wb-frame",
      type: "rectangle",
      position: { x: 90, y: 300 },
      size: { width: 640, height: 260 },
      text: "",
      tone: "lilac",
    }),
  ]),
  makeWhiteboardDocument("blank-whiteboard", "Untitled whiteboard", []),
];

export type TemplateDefinition = {
  id: string;
  kind: DiagramKind;
  labelKey: string;
  descriptionKey: string;
  create: () => DiagramDocument;
};

const cloneWithNewIdentity = (
  document: DiagramDocument,
  preserveTitle = false,
): DiagramDocument => ({
  ...structuredClone(document),
  id: `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: preserveTitle
    ? document.title
    : document.kind === "whiteboard"
      ? "Untitled whiteboard"
      : document.kind === "er"
        ? "Untitled ER diagram"
        : `Untitled ${document.kind}`,
  revision: 0,
  updatedAt: new Date().toISOString(),
});

export const templateDefinitions: TemplateDefinition[] = [
  { id: "architecture-commerce", kind: "architecture", labelKey: "architectureTemplate", descriptionKey: "architectureTemplateHint", create: () => structuredClone(starterDocuments[0]) },
  { id: "flowchart-incident", kind: "flowchart", labelKey: "flowchartTemplate", descriptionKey: "flowchartTemplateHint", create: () => structuredClone(starterDocuments[1]) },
  { id: "er-commerce", kind: "er", labelKey: "erTemplate", descriptionKey: "erTemplateHint", create: () => structuredClone(starterDocuments[2]) },
  { id: "sequence-checkout", kind: "sequence", labelKey: "sequenceTemplate", descriptionKey: "sequenceTemplateHint", create: () => structuredClone(starterDocuments[3]) },
  { id: "mindmap-product", kind: "mindmap", labelKey: "productMindMapTemplate", descriptionKey: "productMindMapTemplateHint", create: () => structuredClone(starterDocuments[4]) },
  { id: "mindmap-roadmap", kind: "mindmap", labelKey: "roadmapMindMapTemplate", descriptionKey: "roadmapMindMapTemplateHint", create: () => structuredClone(starterDocuments[5]) },
  { id: "whiteboard-brainstorm", kind: "whiteboard", labelKey: "brainstormWhiteboardTemplate", descriptionKey: "brainstormWhiteboardTemplateHint", create: () => structuredClone(starterDocuments[6]) },
  { id: "whiteboard-blank", kind: "whiteboard", labelKey: "blankWhiteboardTemplate", descriptionKey: "blankWhiteboardTemplateHint", create: () => structuredClone(starterDocuments[7]) },
];

export const blankDocument = (
  kind: DiagramKind = "flowchart",
  templateId?: string,
): DiagramDocument => {
  const template = templateId
    ? templateDefinitions.find((candidate) => candidate.id === templateId)
    : templateDefinitions.find((candidate) => candidate.kind === kind);
  if (templateId && template) return cloneWithNewIdentity(template.create(), true);
  if (kind === "whiteboard") {
    return cloneWithNewIdentity(
      makeWhiteboardDocument(`diagram-${Date.now()}`, "Untitled whiteboard", []),
    );
  }
  if (kind === "mindmap") {
    const root: SeedNode = [
      "root",
      "Main topic",
      "Double-click to rename",
      "service",
      100,
      220,
    ];
    return cloneWithNewIdentity(
      makeMindMapDocument(`diagram-${Date.now()}`, "Untitled mind map", root, [], []),
    );
  }
  return cloneWithNewIdentity(
    makeDocument(
      `diagram-${Date.now()}`,
      kind === "er" ? "Untitled ER diagram" : `Untitled ${kind}`,
      kind,
      [["start", kind === "er" ? "ENTITY" : "Start here", "Double-click to rename", kind === "er" ? "entity" : "process", 120, 100, kind === "er" ? ["uuid id PK"] : []]],
      [],
    ),
  );
};
