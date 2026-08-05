import { z } from "zod";
import {
  diagramDocumentSchema,
  diagramEdgeSchema,
  diagramMotionSchema,
  diagramNodeSchema,
  nodeDataSchema,
  type DiagramDocument,
} from "./diagram-schema";

const nodeDataPatchSchema = nodeDataSchema.partial();

const edgePatchSchema = z
  .object({
    label: z.string().max(80).optional(),
    type: z.enum(["smoothstep", "straight", "bezier"]).optional(),
    animated: z.boolean().optional(),
  })
  .strict();

/**
 * Small, ID-addressed edits let a model change one part of a graph without
 * regenerating (and accidentally dropping) the rest of the document.
 */
export const diagramOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_title"), title: z.string().min(1).max(100) }),
  z.object({ op: z.literal("set_direction"), direction: z.enum(["LR", "TB"]) }),
  z.object({ op: z.literal("set_motion"), motion: diagramMotionSchema }),
  z.object({
    op: z.literal("update_node"),
    id: z.string().min(1),
    patch: nodeDataPatchSchema,
  }),
  z.object({
    op: z.literal("add_node"),
    node: diagramNodeSchema,
  }),
  z.object({ op: z.literal("remove_node"), id: z.string().min(1) }),
  z.object({
    op: z.literal("update_edge"),
    id: z.string().min(1),
    patch: edgePatchSchema,
  }),
  z.object({
    op: z.literal("add_edge"),
    edge: diagramEdgeSchema,
  }),
  z.object({ op: z.literal("remove_edge"), id: z.string().min(1) }),
]);

export type DiagramOperation = z.infer<typeof diagramOperationSchema>;

function graphIds(diagram: DiagramDocument) {
  return new Set([
    ...diagram.nodes.map((node) => node.id),
    ...diagram.edges.map((edge) => edge.id),
  ]);
}

export function applyDiagramOperations(
  current: DiagramDocument,
  operations: DiagramOperation[],
): DiagramDocument {
  const next = structuredClone(current);

  for (const operation of operations) {
    if (operation.op === "set_title") {
      next.title = operation.title;
      continue;
    }
    if (operation.op === "set_direction") {
      next.direction = operation.direction;
      continue;
    }
    if (operation.op === "set_motion") {
      next.motion = structuredClone(operation.motion);
      continue;
    }
    if (operation.op === "update_node") {
      const node = next.nodes.find((candidate) => candidate.id === operation.id);
      if (!node) throw new Error(`Node ${operation.id} was not found.`);
      node.data = { ...node.data, ...operation.patch };
      continue;
    }
    if (operation.op === "add_node") {
      if (graphIds(next).has(operation.node.id)) {
        throw new Error(`Graph id ${operation.node.id} is already in use.`);
      }
      next.nodes.push(structuredClone(operation.node));
      continue;
    }
    if (operation.op === "remove_node") {
      const index = next.nodes.findIndex((candidate) => candidate.id === operation.id);
      if (index < 0) throw new Error(`Node ${operation.id} was not found.`);
      next.nodes.splice(index, 1);
      next.edges = next.edges.filter(
        (edge) => edge.source !== operation.id && edge.target !== operation.id,
      );
      continue;
    }
    if (operation.op === "update_edge") {
      const edge = next.edges.find((candidate) => candidate.id === operation.id);
      if (!edge) throw new Error(`Edge ${operation.id} was not found.`);
      Object.assign(edge, operation.patch);
      continue;
    }
    if (operation.op === "add_edge") {
      if (graphIds(next).has(operation.edge.id)) {
        throw new Error(`Graph id ${operation.edge.id} is already in use.`);
      }
      next.edges.push(structuredClone(operation.edge));
      continue;
    }
    const index = next.edges.findIndex((candidate) => candidate.id === operation.id);
    if (index < 0) throw new Error(`Edge ${operation.id} was not found.`);
    next.edges.splice(index, 1);
  }

  return diagramDocumentSchema.parse(next);
}
