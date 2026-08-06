import { describe, expect, it } from "vitest";
import {
  getKrokiEngineDefinition,
  krokiEngineDefinitions,
  supportsKrokiEngine,
  toD2,
  toDbml,
  toGraphviz,
  toKrokiSource,
  toPlantUml,
} from "@/lib/kroki";
import { starterDocuments } from "@/lib/templates";

describe("Kroki renderer adapters", () => {
  it("exposes a small capability matrix with renderer-specific formats", () => {
    expect(krokiEngineDefinitions.map((definition) => definition.id)).toEqual([
      "mermaid",
      "plantuml",
      "graphviz",
      "d2",
      "dbml",
    ]);
    expect(getKrokiEngineDefinition("d2").formats).toEqual(["svg"]);
    expect(getKrokiEngineDefinition("graphviz").formats).toContain("pdf");
    expect(supportsKrokiEngine(starterDocuments[2], "dbml")).toBe(true);
    expect(supportsKrokiEngine(starterDocuments[0], "dbml")).toBe(false);
  });

  it("converts architecture graphs to Graphviz with stable labels and edges", () => {
    const source = toGraphviz(starterDocuments[0]);
    expect(source).toContain("digraph VibeChart");
    expect(source).toContain('rankdir=LR');
    expect(source).toContain('label="API Gateway"');
    expect(source).toContain('client -> gateway [label="HTTPS"]');
  });

  it("converts sequence diagrams to PlantUML participants and messages", () => {
    const source = toPlantUml(starterDocuments[3]);
    expect(source).toContain("@startuml");
    expect(source).toContain('participant "Customer" as customer');
    expect(source).toContain("customer -> checkout : submit order");
    expect(source).toContain("@enduml");
  });

  it("converts mind maps to PlantUML mindmap syntax", () => {
    const mindMap = starterDocuments.find((document) => document.kind === "mindmap")!;
    const source = toPlantUml(mindMap);
    expect(source).toContain("@startmindmap");
    expect(source).toContain("* Product strategy");
    expect(source).toContain("** Users");
    expect(source).toContain("@endmindmap");
  });

  it("converts diagrams to D2 and keeps DBML limited to ER models", () => {
    const d2 = toD2(starterDocuments[0]);
    expect(d2).toContain("direction: right");
    expect(d2).toContain('gateway: "API Gateway"');
    expect(d2).toContain("client -> gateway: \"HTTPS\"");

    const dbml = toDbml(starterDocuments[2]);
    expect(dbml).toContain("Table user");
    expect(dbml).toContain("id uuid [pk]");
    expect(dbml).toContain("Ref: user.id > order.id");
    expect(() => toKrokiSource(starterDocuments[0], "dbml")).toThrow(
      /does not support/,
    );
  });
});
