"use client";

import { useState } from "react";
import {
  Database,
  Diamond,
  Globe,
  HardDrives,
  Robot,
  Sparkle,
  Trash,
  UserCircle,
} from "@phosphor-icons/react";
import { nodeShapes, type NodeShape } from "@/lib/diagram-schema";
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
  const [tab, setTab] = useState<"design" | "ai">("ai");
  const diagram = useVibeChartStore(selectActiveDocument);
  const selectedNodeId = useVibeChartStore((state) => state.selectedNodeId);
  const updateSelectedNode = useVibeChartStore(
    (state) => state.updateSelectedNode,
  );
  const removeSelectedNode = useVibeChartStore(
    (state) => state.removeSelectedNode,
  );
  const selected = diagram.nodes.find((node) => node.id === selectedNodeId);

  return (
    <aside className="inspector-panel" aria-label="Diagram inspector">
      <div className="inspector-tabs" role="tablist">
        <button
          type="button"
          className={tab === "design" ? "is-active" : ""}
          onClick={() => setTab("design")}
          role="tab"
        >
          Properties
        </button>
        <button
          type="button"
          className={tab === "ai" ? "is-active" : ""}
          onClick={() => setTab("ai")}
          role="tab"
        >
          <Sparkle size={13} weight="fill" />
          AI
        </button>
      </div>
      {tab === "ai" ? (
        <AiPanel />
      ) : (
        <div className="properties-panel">
          {selected ? (
            <>
              <header className="properties-title">
                <div>
                  <strong>Selected node</strong>
                  <small>{selected.id}</small>
                </div>
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={removeSelectedNode}
                  aria-label="Delete selected node"
                >
                  <Trash size={16} />
                </button>
              </header>
              <label>
                Label
                <input
                  value={selected.data.label}
                  onChange={(event) =>
                    updateSelectedNode({ label: event.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  rows={3}
                  value={selected.data.subtitle}
                  onChange={(event) =>
                    updateSelectedNode({ subtitle: event.target.value })
                  }
                />
              </label>
              <fieldset>
                <legend>Shape</legend>
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
                        {shape}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend>Accent</legend>
                <div className="tone-grid">
                  {(["lilac", "slate", "cyan", "amber", "rose"] as const).map(
                    (tone) => (
                      <button
                        type="button"
                        aria-label={`${tone} accent`}
                        title={tone}
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
                  Fields
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
                  <small>One field per line: type name constraint</small>
                </label>
              ) : null}
            </>
          ) : (
            <div className="empty-properties">
              <Robot size={28} weight="duotone" />
              <strong>Select a node</strong>
              <p>Click a node on the canvas to edit its content and style.</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

