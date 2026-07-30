import { z } from "zod";

export const diagramKinds = [
  "architecture",
  "flowchart",
  "er",
  "sequence",
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

export const diagramDocumentSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(100),
    kind: z.enum(diagramKinds),
    direction: z.enum(["LR", "TB"]).default("LR"),
    revision: z.number().int().nonnegative().default(0),
    nodes: z.array(diagramNodeSchema).min(1).max(120),
    edges: z.array(diagramEdgeSchema).max(240),
    updatedAt: z.string().datetime(),
  })
  .superRefine((diagram, ctx) => {
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
  });

export type DiagramKind = (typeof diagramKinds)[number];
export type NodeShape = (typeof nodeShapes)[number];
export type VibeNodeData = z.infer<typeof nodeDataSchema> & Record<string, unknown>;
export type VibeNode = z.infer<typeof diagramNodeSchema>;
export type VibeEdge = z.infer<typeof diagramEdgeSchema>;
export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;

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
