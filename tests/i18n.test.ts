import { describe, expect, it } from "vitest";
import { messages, translate } from "@/lib/i18n";

describe("editor internationalization", () => {
  it("keeps the English and Chinese dictionaries in parity", () => {
    expect(Object.keys(messages.zh).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it("interpolates locale-aware labels", () => {
    expect(translate("en", "nodes", { count: 4 })).toBe("4 nodes");
    expect(translate("zh", "nodes", { count: 4 })).toBe("4 个节点");
    expect(translate("zh", "diagramNode", { label: "API" })).toBe(
      "API 图表节点",
    );
  });
});
