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

  it("normalizes human labels into stable ids", () => {
    expect(safeId("Order Service v2")).toBe("Order_Service_v2");
    expect(safeId("123")).toBe("n_123");
  });
});

