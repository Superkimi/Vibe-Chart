import { describe, expect, it } from "vitest";
import { applyDiagramOperations } from "@/lib/diagram-operations";
import { starterDocuments } from "@/lib/templates";

describe("AI diagram operations", () => {
  it("keeps unrelated graph content when applying a targeted update", () => {
    const current = structuredClone(starterDocuments[0]);
    const untouched = current.nodes[1].data.label;
    const next = applyDiagramOperations(current, [
      {
        op: "update_node",
        id: current.nodes[0].id,
        patch: { label: "Renamed client", tone: "cyan" },
      },
    ]);

    expect(next.nodes[0].data.label).toBe("Renamed client");
    expect(next.nodes[0].data.tone).toBe("cyan");
    expect(next.nodes[1].data.label).toBe(untouched);
    expect(next.edges).toEqual(current.edges);
  });

  it("cascades connected edges when a node is removed", () => {
    const current = structuredClone(starterDocuments[0]);
    const removed = current.nodes[0].id;
    const next = applyDiagramOperations(current, [
      { op: "remove_node", id: removed },
    ]);

    expect(next.nodes.some((node) => node.id === removed)).toBe(false);
    expect(
      next.edges.some(
        (edge) => edge.source === removed || edge.target === removed,
      ),
    ).toBe(false);
  });

  it("rejects updates for ids that are not in the current graph", () => {
    const current = structuredClone(starterDocuments[0]);
    expect(() =>
      applyDiagramOperations(current, [
        { op: "update_node", id: "missing", patch: { label: "Nope" } },
      ]),
    ).toThrow("Node missing was not found");
  });
});
