import { describe, expect, it } from "vitest";
import {
  edgePoints,
  motionFrameAt,
  motionSteps,
  motionTimeline,
  pointAlongPath,
} from "@/lib/motion";
import { starterDocuments } from "@/lib/templates";

describe("schema-first motion timeline", () => {
  it("derives a stable trace from an enabled diagram", () => {
    const diagram = structuredClone(starterDocuments[0]);
    const steps = motionSteps(diagram);
    expect(steps).toHaveLength(diagram.edges.length);
    expect(steps[0].edgeIds).toEqual([diagram.edges[0].id]);
    expect(motionTimeline(diagram).at(-1)?.endMs).toBeGreaterThanOrEqual(4800);
    expect(motionTimeline(diagram).at(-1)?.endMs).toBeLessThanOrEqual(4806);
  });

  it("keeps disabled diagrams still unless an edge is explicitly animated", () => {
    const diagram = structuredClone(starterDocuments[0]);
    diagram.motion.enabled = false;
    expect(motionSteps(diagram)).toEqual([]);
    diagram.edges[0].animated = true;
    expect(motionSteps(diagram)).toHaveLength(1);
  });

  it("interpolates a token across the generated edge path", () => {
    const diagram = structuredClone(starterDocuments[0]);
    const points = edgePoints(diagram, diagram.edges[0]);
    expect(points.length).toBeGreaterThan(1);
    expect(pointAlongPath(points, 0)).toEqual(points[0]);
    expect(pointAlongPath(points, 1)).toEqual(points.at(-1));
    const frame = motionFrameAt(diagram, 0.25);
    expect(frame.entry?.edgeIds).toHaveLength(1);
    expect(frame.progress).toBeGreaterThanOrEqual(0);
    expect(frame.progress).toBeLessThanOrEqual(1);
  });
});
