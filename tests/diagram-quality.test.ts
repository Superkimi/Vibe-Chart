import { describe, expect, it } from "vitest";
import { assessDiagramQuality } from "@/lib/diagram-quality";
import { starterDocuments } from "@/lib/templates";

describe("diagram quality checks", () => {
  it("flags overlapping nodes as critical", () => {
    const diagram = structuredClone(starterDocuments[0]);
    diagram.nodes[1].position = structuredClone(diagram.nodes[0].position);

    const issues = assessDiagramQuality(diagram);

    expect(
      issues.some(
        (issue) => issue.type === "overlap" && issue.severity === "critical",
      ),
    ).toBe(true);
  });

  it("flags an edge that passes through an unrelated node", () => {
    const diagram = structuredClone(starterDocuments[0]);
    diagram.nodes[0].position = { x: 0, y: 0 };
    diagram.nodes[1].position = { x: 420, y: 0 };
    diagram.nodes[2].position = { x: 210, y: 0 };
    diagram.edges = [
      {
        id: "route-test",
        source: diagram.nodes[0].id,
        target: diagram.nodes[1].id,
        label: "",
        type: "straight",
        animated: false,
      },
    ];

    const issues = assessDiagramQuality(diagram);

    expect(issues.some((issue) => issue.edgeId === "route-test")).toBe(true);
  });
});
