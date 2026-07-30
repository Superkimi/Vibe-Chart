"use client";

import {
  ArrowsClockwise,
  Copy,
  Database,
  DotsThree,
  FlowArrow,
  GitBranch,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { DiagramKind } from "@/lib/diagram-schema";
import { useVibeChartStore } from "@/lib/store";

const kindIcon = {
  architecture: GitBranch,
  flowchart: FlowArrow,
  er: Database,
  sequence: ArrowsClockwise,
};

const createOptions: Array<{ kind: DiagramKind; label: string }> = [
  { kind: "architecture", label: "Architecture" },
  { kind: "flowchart", label: "Flowchart" },
  { kind: "er", label: "ER diagram" },
  { kind: "sequence", label: "Sequence" },
];

export function DocumentSidebar() {
  const documents = useVibeChartStore((state) => state.documents);
  const activeId = useVibeChartStore((state) => state.activeId);
  const setActive = useVibeChartStore((state) => state.setActive);
  const addDocument = useVibeChartStore((state) => state.addDocument);
  const duplicateDocument = useVibeChartStore(
    (state) => state.duplicateDocument,
  );
  const deleteDocument = useVibeChartStore((state) => state.deleteDocument);

  return (
    <aside className="document-sidebar" aria-label="Diagram directory">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <GitBranch size={20} weight="bold" />
        </div>
        <div>
          <strong>Vibe Chart</strong>
          <span>Diagram studio</span>
        </div>
      </div>

      <details className="new-diagram-menu">
        <summary>
          <Plus size={15} weight="bold" />
          New diagram
        </summary>
        <div className="new-diagram-popover">
          {createOptions.map(({ kind, label }) => {
            const Icon = kindIcon[kind];
            return (
              <button type="button" key={kind} onClick={() => addDocument(kind)}>
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
      </details>

      <div className="sidebar-section-label">
        <span>Workspace</span>
        <small>{documents.length}</small>
      </div>

      <nav className="document-list">
        {documents.map((document) => {
          const Icon = kindIcon[document.kind];
          return (
            <button
              type="button"
              className={document.id === activeId ? "is-active" : ""}
              key={document.id}
              onClick={() => setActive(document.id)}
            >
              <Icon size={16} weight="duotone" />
              <span>
                <strong>{document.title}</strong>
                <small>
                  {document.kind} · {document.nodes.length} nodes
                </small>
              </span>
              <DotsThree size={17} aria-hidden="true" />
            </button>
          );
        })}
      </nav>

      <div className="sidebar-actions">
        <button
          type="button"
          onClick={() => duplicateDocument(activeId)}
          title="Duplicate current diagram"
        >
          <Copy size={15} />
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => deleteDocument(activeId)}
          title="Delete current diagram"
        >
          <Trash size={15} />
          Delete
        </button>
      </div>
      <p className="local-note">Saved locally in this browser.</p>
    </aside>
  );
}

