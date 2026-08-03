"use client";

import { useState } from "react";
import {
  Database,
  Diamond,
  Globe,
  HardDrives,
  FlowArrow,
  Robot,
  Sparkle,
  Trash,
  UserCircle,
} from "@phosphor-icons/react";
import { nodeShapes, type NodeShape } from "@/lib/diagram-schema";
import { useI18n } from "@/lib/i18n";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";
import { AiPanel } from "./AiPanel";

const shapeIcons = {
  service: HardDrives,
  process: Robot,
  decision: Diamond,
  database: Database,
  external: Globe,
  actor: UserCircle,
  entity: Database,
};

export function InspectorPanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"design" | "ai">("ai");
  const diagram = useVibeChartStore(selectActiveDocument);
  const selectedNodeId = useVibeChartStore((state) => state.selectedNodeId);
  const selectedEdgeId = useVibeChartStore((state) => state.selectedEdgeId);
  const updateSelectedNode = useVibeChartStore(
    (state) => state.updateSelectedNode,
  );
  const removeSelectedNode = useVibeChartStore(
    (state) => state.removeSelectedNode,
  );
  const updateSelectedEdge = useVibeChartStore(
    (state) => state.updateSelectedEdge,
  );
  const removeSelectedEdge = useVibeChartStore(
    (state) => state.removeSelectedEdge,
  );
  const selected = diagram.nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = diagram.edges.find((edge) => edge.id === selectedEdgeId);

  return (
    <aside className="inspector-panel" aria-label={t("diagramInspector")}>
      <div className="inspector-tabs" role="tablist">
        <button
          type="button"
          className={tab === "design" ? "is-active" : ""}
          onClick={() => setTab("design")}
          role="tab"
        >
          {t("properties")}
        </button>
        <button
          type="button"
          className={tab === "ai" ? "is-active" : ""}
          onClick={() => setTab("ai")}
          role="tab"
        >
          <Sparkle size={13} weight="fill" />
          {t("ai")}
        </button>
      </div>
      {tab === "ai" ? (
        <AiPanel key={diagram.id} />
      ) : (
        <div className="properties-panel">
          {selected ? (
            <>
              <header className="properties-title">
                <div>
                  <strong>{t("selectedNode")}</strong>
                  <small>{selected.id}</small>
                </div>
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={removeSelectedNode}
                  aria-label={t("deleteSelectedNode")}
                >
                  <Trash size={16} />
                </button>
              </header>
              <label>
                {t("label")}
                <input
                  value={selected.data.label}
                  onChange={(event) =>
                    updateSelectedNode({ label: event.target.value })
                  }
                />
              </label>
              <label>
                {t("description")}
                <textarea
                  rows={3}
                  value={selected.data.subtitle}
                  onChange={(event) =>
                    updateSelectedNode({ subtitle: event.target.value })
                  }
                />
              </label>
              <fieldset>
                <legend>{t("shape")}</legend>
                <div className="shape-grid">
                  {nodeShapes.map((shape) => {
                    const Icon = shapeIcons[shape];
                    return (
                      <button
                        type="button"
                        key={shape}
                        className={
                          selected.data.shape === shape ? "is-active" : ""
                        }
                        onClick={() =>
                          updateSelectedNode({ shape: shape as NodeShape })
                        }
                      >
                        <Icon size={16} />
                        {t(shape)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend>{t("accent")}</legend>
                <div className="tone-grid">
                  {(["lilac", "slate", "cyan", "amber", "rose"] as const).map(
                    (tone) => (
                      <button
                        type="button"
                        aria-label={t("toneAccent", { tone: t(tone) })}
                        title={t(tone)}
                        key={tone}
                        className={`tone-swatch tone-${tone} ${selected.data.tone === tone ? "is-active" : ""}`}
                        onClick={() => updateSelectedNode({ tone })}
                      />
                    ),
                  )}
                </div>
              </fieldset>
              {selected.data.shape === "entity" ? (
                <label>
                  {t("fields")}
                  <textarea
                    rows={7}
                    className="mono-input"
                    value={(selected.data.fields ?? []).join("\n")}
                    onChange={(event) =>
                      updateSelectedNode({
                        fields: event.target.value
                          .split("\n")
                          .map((field) => field.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                  <small>{t("fieldHint")}</small>
                </label>
              ) : null}
            </>
          ) : selectedEdge ? (
            <>
              <header className="properties-title">
                <div>
                  <strong>{t("selectedConnection")}</strong>
                  <small>{selectedEdge.source} → {selectedEdge.target}</small>
                </div>
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={removeSelectedEdge}
                  aria-label={t("deleteSelectedConnection")}
                >
                  <Trash size={16} />
                </button>
              </header>
              <label>
                {t("label")}
                <input
                  value={selectedEdge.label}
                  onChange={(event) =>
                    updateSelectedEdge({ label: event.target.value })
                  }
                  placeholder={t("edgeLabelPlaceholder")}
                />
              </label>
              <fieldset>
                <legend>{t("lineStyle")}</legend>
                <div className="shape-grid">
                  {(["smoothstep", "straight", "bezier"] as const).map(
                    (type) => (
                      <button
                        type="button"
                        key={type}
                        className={selectedEdge.type === type ? "is-active" : ""}
                        onClick={() => updateSelectedEdge({ type })}
                      >
                        <FlowArrow size={16} />
                        {t(type)}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
              <label className="edge-toggle">
                <input
                  type="checkbox"
                  checked={selectedEdge.animated}
                  onChange={(event) =>
                    updateSelectedEdge({ animated: event.target.checked })
                  }
                />
                {t("animateDirection")}
              </label>
            </>
          ) : (
            <div className="empty-properties">
              <Robot size={28} weight="duotone" />
              <strong>{t("selectNode")}</strong>
              <p>{t("selectNodeHint")}</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
