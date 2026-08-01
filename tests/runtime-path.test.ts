import { describe, expect, it } from "vitest";
import { withBasePath } from "@/lib/runtime-path";

describe("withBasePath", () => {
  it("keeps root-relative paths unchanged without a deployment prefix", () => {
    expect(withBasePath("/api/ai/chart", "")).toBe("/api/ai/chart");
  });

  it("prefixes application routes for subpath deployments", () => {
    expect(withBasePath("/api/ai/chart", "/vibe-chart")).toBe(
      "/vibe-chart/api/ai/chart",
    );
  });
});
