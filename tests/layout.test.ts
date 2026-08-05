import { describe, expect, it } from "vitest";
import { layoutDiagram } from "@/lib/layout";
import { starterDocuments } from "@/lib/templates";

describe("diagram layout", () => {
  it("lays out connected nodes from left to right without changing ids", () => {
    const original = starterDocuments[1];
    const result = layoutDiagram(original, "LR");
    const positions = new Map(
      result.nodes.map((node) => [node.id, node.position]),
    );

    expect(result.direction).toBe("LR");
    expect(result.nodes.map((node) => node.id)).toEqual(
      original.nodes.map((node) => node.id),
    );
    expect(positions.get("alert")!.x).toBeLessThan(
      positions.get("impact")!.x,
    );
    expect(positions.get("impact")!.x).toBeLessThan(
      positions.get("resolve")!.x,
    );
  });

  it("supports top-to-bottom layouts", () => {
    const result = layoutDiagram(starterDocuments[1], "TB");
    const positions = new Map(
      result.nodes.map((node) => [node.id, node.position]),
    );
    expect(positions.get("alert")!.y).toBeLessThan(
      positions.get("impact")!.y,
    );
  });

  it("keeps mind map branches to the right of their root", () => {
    const original = starterDocuments.find((document) => document.kind === "mindmap")!;
    const result = layoutDiagram(original);
    const root = result.nodes.find((node) => node.id === result.mindmap?.rootId)!;
    const branch = result.nodes.find((node) => node.id === "product-users")!;
    expect(branch.position.x).toBeGreaterThan(root.position.x);
    expect(result.nodes.map((node) => node.id)).toEqual(original.nodes.map((node) => node.id));
  });
});
