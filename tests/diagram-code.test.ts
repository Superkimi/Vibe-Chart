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
    expect(source).toContain('user["USER"]');
    expect(source).toContain('user ||--o{ order : "places"');
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

  it("applies code edits to existing node labels and shapes", () => {
    const parsed = fromMermaid(
      `flowchart LR
        alert["Incoming request"]
        impact{"Accepted?"}
        alert --> impact`,
      starterDocuments[1],
    );

    expect(parsed.nodes[0].data.label).toBe("Incoming request");
    expect(parsed.nodes[1].data.label).toBe("Accepted?");
    expect(parsed.nodes[1].data.shape).toBe("decision");
    expect(parsed.nodes[0].position).toEqual(
      starterDocuments[1].nodes[0].position,
    );
  });

  it("uses stable unique ER identifiers for localized and duplicate labels", () => {
    const localized = structuredClone(starterDocuments[2]);
    localized.nodes[0].data.label = "订单";
    localized.nodes[1].data.label = "订单";
    const source = toMermaid(localized);

    expect(source).toContain('user["订单"]');
    expect(source).toContain('order["订单"]');
    expect(source).toContain('user ||--o{ order : "places"');

    localized.nodes[0].data.label = "Account";
    localized.nodes[1].data.label = "Account";
    const duplicateSource = toMermaid(localized);
    expect(duplicateSource).toContain('user["Account"]');
    expect(duplicateSource).toContain('order["Account"]');
  });

  it("exports sequence diagrams as Mermaid participants and messages", () => {
    const sequence = {
      ...structuredClone(starterDocuments[0]),
      kind: "sequence" as const,
    };
    const source = toMermaid(sequence);
    expect(source).toContain("sequenceDiagram");
    expect(source).toContain("participant client as Web & Mobile");
    expect(source).toContain("client->>gateway: HTTPS");
  });

  it("round-trips ER aliases, fields, and relationships", () => {
    const source = toMermaid(starterDocuments[2]).replace(
      'order["ORDER"]',
      'order["PURCHASE"]',
    );
    const parsed = fromMermaid(source, starterDocuments[2]);

    expect(parsed.kind).toBe("er");
    expect(parsed.nodes.find((node) => node.id === "order")?.data.label).toBe(
      "PURCHASE",
    );
    expect(
      parsed.nodes.find((node) => node.id === "order")?.data.fields,
    ).toContain("decimal total");
    expect(parsed.edges[0]).toMatchObject({
      source: "user",
      target: "order",
      label: "places",
    });
  });

  it("round-trips sequence participants and messages", () => {
    const sequence = {
      ...structuredClone(starterDocuments[0]),
      kind: "sequence" as const,
    };
    const parsed = fromMermaid(
      toMermaid(sequence).replace(
        "participant gateway as API Gateway",
        "participant gateway as Public API",
      ),
      sequence,
    );

    expect(parsed.kind).toBe("sequence");
    expect(parsed.nodes.find((node) => node.id === "gateway")?.data.label).toBe(
      "Public API",
    );
    expect(parsed.edges[0]).toMatchObject({
      source: "client",
      target: "gateway",
      label: "HTTPS",
    });
  });

  it("keeps parallel sequence messages as distinct edges", () => {
    const current = {
      ...structuredClone(starterDocuments[0]),
      kind: "sequence" as const,
    };
    const parsed = fromMermaid(
      `sequenceDiagram
        participant client as Client
        participant gateway as Gateway
        client->>gateway: Request
        client->>gateway: Retry`,
      current,
    );
    expect(parsed.edges).toHaveLength(2);
    expect(new Set(parsed.edges.map((edge) => edge.id)).size).toBe(2);
    expect(parsed.edges.map((edge) => edge.label)).toEqual(["Request", "Retry"]);
  });

  it("exports editable draw.io mxGraphModel XML", () => {
    const xml = toDrawio(starterDocuments[0]);
    expect(xml).toContain("<mxfile");
    expect(xml).toContain("<mxGraphModel");
    expect(xml).toContain('source="client" target="gateway"');
    expect(xml).toContain('value="API Gateway"');
    const parsed = new DOMParser().parseFromString(xml, "application/xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    const ids = [...parsed.querySelectorAll("mxCell")].map((cell) =>
      cell.getAttribute("id"),
    );
    expect(new Set(ids).size).toBe(ids.length);
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
