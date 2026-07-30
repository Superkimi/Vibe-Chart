import { describe, expect, it, vi } from "vitest";
import {
  downloadText,
  fromMermaid,
  toDrawio,
  toMermaid,
} from "@/lib/diagram-code";
import { starterDocuments } from "@/lib/templates";

describe("diagram code adapters", () => {
  it("produces portable Mermaid flowchart source", () => {
    const source = toMermaid(starterDocuments[0]);
    expect(source).toContain("flowchart LR");
    expect(source).toContain('gateway["API Gateway"]');
    expect(source).toContain("client -->|HTTPS| gateway");
  });

  it("produces Mermaid ER syntax with typed fields", () => {
    const source = toMermaid(starterDocuments[2]);
    expect(source).toContain("erDiagram");
    expect(source).toContain("uuid id PK");
    expect(source).toContain('USER ||--o{ ORDER : "places"');
  });

  it("round-trips compatible flowchart code into the canonical schema", () => {
    const current = starterDocuments[1];
    const parsed = fromMermaid(
      `flowchart TB
        start["Request"]
        check{"Valid?"}
        finish["Complete"]
        start --> check
        check -->|yes| finish`,
      current,
    );

    expect(parsed.direction).toBe("TB");
    expect(parsed.nodes.map((node) => node.id)).toEqual([
      "start",
      "check",
      "finish",
    ]);
    expect(parsed.nodes[1].data.shape).toBe("decision");
    expect(parsed.edges[1].label).toBe("yes");
  });

  it("exports editable draw.io mxGraphModel XML", () => {
    const xml = toDrawio(starterDocuments[0]);
    expect(xml).toContain("<mxfile");
    expect(xml).toContain("<mxGraphModel");
    expect(xml).toContain('source="client" target="gateway"');
    expect(xml).toContain('value="API Gateway"');
  });

  it("downloads text with a temporary object URL", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadText("flowchart LR", "diagram.mmd");

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});

