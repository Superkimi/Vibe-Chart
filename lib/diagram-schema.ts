import { z } from "zod";

export const diagramKinds = [
  "architecture",
  "flowchart",
  "er",
  "sequence",
  "mindmap",
  "whiteboard",
] as const;

export const nodeShapes = [
  "service",
  "process",
  "decision",
  "database",
  "external",
  "actor",
  "entity",
] as const;

export const nodeDataSchema = z.object({
  label: z.string().min(1).max(80),
  subtitle: z.string().max(120).optional().default(""),
  shape: z.enum(nodeShapes).default("process"),
  tone: z.enum(["lilac", "slate", "cyan", "amber", "rose"]).default("lilac"),
  fields: z.array(z.string().max(80)).max(16).optional().default([]),
});

export const diagramNodeSchema = z.object({
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
  type: z.literal("vibeNode").default("vibeNode"),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  data: nodeDataSchema,
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(80).optional().default(""),
  type: z.enum(["smoothstep", "straight", "bezier"]).default("smoothstep"),
  animated: z.boolean().default(false),
});

export const mindMapSchema = z
  .object({
    rootId: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
    layout: z.enum(["tree", "right", "radial"]).default("right"),
  })
  .strict();

export const whiteboardElementSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
    type: z.enum(["text", "sticky", "rectangle", "ellipse", "line"]),
    position: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
    }),
    size: z.object({
      width: z.number().finite().positive().max(2000),
      height: z.number().finite().positive().max(2000),
    }),
    text: z.string().max(2000).default(""),
    tone: z
      .enum(["lilac", "slate", "cyan", "amber", "rose"])
      .default("lilac"),
    rotation: z.number().finite().min(-360).max(360).default(0),
  })
  .strict();

export const whiteboardSchema = z
  .object({
    elements: z.array(whiteboardElementSchema).max(300).default([]),
  })
  .strict();

export const motionStepSchema = z
  .object({
    id: z.string().min(1).max(80),
    nodeIds: z.array(z.string().min(1)).max(24).default([]),
    edgeIds: z.array(z.string().min(1)).max(24).default([]),
    durationMs: z.number().int().min(200).max(5000).default(800),
    caption: z.string().max(160).optional().default(""),
  })
  .strict();

export const diagramMotionSchema = z
  .object({
    enabled: z.boolean().default(false),
    mode: z.enum(["trace", "story"]).default("trace"),
    durationMs: z.number().int().min(500).max(15000).default(4800),
    loop: z.boolean().default(false),
    steps: z.array(motionStepSchema).max(32).default([]),
  })
  .strict();

export const diagramDocumentSchema = z
  .object({
    schemaVersion: z.number().int().positive().default(2),
    id: z.string().min(1),
    title: z.string().min(1).max(100),
    kind: z.enum(diagramKinds),
    direction: z.enum(["LR", "TB"]).default("LR"),
    revision: z.number().int().nonnegative().default(0),
    nodes: z.array(diagramNodeSchema).max(120),
    edges: z.array(diagramEdgeSchema).max(240),
    mindmap: mindMapSchema.optional(),
    whiteboard: whiteboardSchema.optional(),
    motion: diagramMotionSchema.default(() => ({
      enabled: false,
      mode: "trace" as const,
      durationMs: 4800,
      loop: false,
      steps: [],
    })),
    updatedAt: z.string().datetime(),
  })
  .superRefine((diagram, ctx) => {
    if (diagram.kind === "whiteboard") {
      if (diagram.nodes.length || diagram.edges.length) {
        ctx.addIssue({
          code: "custom",
          message: "Whiteboard documents cannot contain graph nodes or edges",
          path: ["whiteboard"],
        });
      }
      const elements = diagram.whiteboard?.elements ?? [];
      const elementIds = new Set<string>();
      for (const element of elements) {
        if (elementIds.has(element.id)) {
          ctx.addIssue({
            code: "custom",
            message: `Duplicate whiteboard element id: ${element.id}`,
            path: ["whiteboard", "elements"],
          });
        }
        elementIds.add(element.id);
      }
      return;
    }

    if (!diagram.nodes.length) {
      ctx.addIssue({
        code: "custom",
        message: "Graph documents must contain at least one node",
        path: ["nodes"],
      });
    }

    if (diagram.kind === "mindmap") {
      if (!diagram.mindmap) {
        ctx.addIssue({
          code: "custom",
          message: "Mind map documents require mindmap metadata",
          path: ["mindmap"],
        });
      } else if (!diagram.nodes.some((node) => node.id === diagram.mindmap?.rootId)) {
        ctx.addIssue({
          code: "custom",
          message: `Mind map root ${diagram.mindmap.rootId} was not found`,
          path: ["mindmap", "rootId"],
        });
      }
    }

    const ids = new Set<string>();
    const edgeIds = new Set<string>();
    for (const node of diagram.nodes) {
      if (ids.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate node id: ${node.id}`,
          path: ["nodes"],
        });
      }
      ids.add(node.id);
    }
    for (const edge of diagram.edges) {
      if (ids.has(edge.id) || edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate graph id: ${edge.id}`,
          path: ["edges"],
        });
      }
      edgeIds.add(edge.id);
      if (!ids.has(edge.source) || !ids.has(edge.target)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge ${edge.id} references a missing node`,
          path: ["edges"],
        });
      }
    }
    const motionNodeIds = ids;
    const motionEdgeIds = edgeIds;
    for (const step of diagram.motion.steps) {
      for (const nodeId of step.nodeIds) {
        if (!motionNodeIds.has(nodeId)) {
          ctx.addIssue({
            code: "custom",
            message: `Motion step ${step.id} references missing node ${nodeId}`,
            path: ["motion", "steps"],
          });
        }
      }
      for (const edgeId of step.edgeIds) {
        if (!motionEdgeIds.has(edgeId)) {
          ctx.addIssue({
            code: "custom",
            message: `Motion step ${step.id} references missing edge ${edgeId}`,
            path: ["motion", "steps"],
          });
        }
      }
    }
  });

export type DiagramKind = (typeof diagramKinds)[number];
export type NodeShape = (typeof nodeShapes)[number];
export type VibeNodeData = z.infer<typeof nodeDataSchema> & Record<string, unknown>;
export type VibeNode = z.infer<typeof diagramNodeSchema>;
export type VibeEdge = z.infer<typeof diagramEdgeSchema>;
export type MotionStep = z.infer<typeof motionStepSchema>;
export type DiagramMotion = z.infer<typeof diagramMotionSchema>;
export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;
export type MindMap = z.infer<typeof mindMapSchema>;
export type WhiteboardElement = z.infer<typeof whiteboardElementSchema>;
export type Whiteboard = z.infer<typeof whiteboardSchema>;

export const isWhiteboardDocument = (diagram: DiagramDocument) =>
  diagram.kind === "whiteboard";

export function validateDiagram(input: unknown): DiagramDocument {
  return diagramDocumentSchema.parse(input);
}

export function safeId(value: string, fallback = "node") {
  const normalize = (input: string) =>
    input
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const normalized = normalize(value) || normalize(fallback) || "node";
  return /^[A-Za-z]/.test(normalized) ? normalized : `n_${normalized}`;
}
