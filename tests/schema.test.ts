import { describe, expect, it } from "vitest";
import {
  safeId,
  validateDiagram,
} from "@/lib/diagram-schema";
import { starterDocuments } from "@/lib/templates";

describe("canonical diagram schema", () => {
  it("accepts all built-in diagram templates", () => {
    for (const document of starterDocuments) {
      expect(validateDiagram(document).id).toBe(document.id);
    }
  });

  it("rejects duplicate node ids", () => {
    const invalid = structuredClone(starterDocuments[0]);
    invalid.nodes[1].id = invalid.nodes[0].id;
    expect(() => validateDiagram(invalid)).toThrow(/Duplicate node id/);
  });

  it("rejects edges that reference missing nodes", () => {
    const invalid = structuredClone(starterDocuments[0]);
    invalid.edges[0].target = "missing";
    expect(() => validateDiagram(invalid)).toThrow(/missing node/);
  });

  it("rejects duplicate edge ids and node-edge id collisions", () => {
    const duplicate = structuredClone(starterDocuments[0]);
    duplicate.edges[1].id = duplicate.edges[0].id;
    expect(() => validateDiagram(duplicate)).toThrow(/Duplicate graph id/);

    const collision = structuredClone(starterDocuments[0]);
    collision.edges[0].id = collision.nodes[0].id;
    expect(() => validateDiagram(collision)).toThrow(/Duplicate graph id/);
  });

  it("normalizes human labels into stable ids", () => {
    expect(safeId("Order Service v2")).toBe("Order_Service_v2");
    expect(safeId("123")).toBe("n_123");
  });

  it("validates motion references against the graph", () => {
    const invalid = structuredClone(starterDocuments[0]);
    invalid.motion.steps = [
      {
        id: "missing-edge-step",
        nodeIds: [invalid.nodes[0].id],
        edgeIds: ["missing-edge"],
        durationMs: 600,
        caption: "",
      },
    ];
    expect(() => validateDiagram(invalid)).toThrow(/missing edge/);
  });
});
