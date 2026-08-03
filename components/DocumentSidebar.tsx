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
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useVibeChartStore } from "@/lib/store";

const kindIcon = {
  architecture: GitBranch,
  flowchart: FlowArrow,
  er: Database,
  sequence: ArrowsClockwise,
};

const createOptions: Array<{ kind: DiagramKind; labelKey: TranslationKey }> = [
  { kind: "architecture", labelKey: "architecture" },
  { kind: "flowchart", labelKey: "flowchart" },
  { kind: "er", labelKey: "erDiagram" },
  { kind: "sequence", labelKey: "sequence" },
];

export function DocumentSidebar() {
  const { t } = useI18n();
  const documents = useVibeChartStore((state) => state.documents);
  const activeId = useVibeChartStore((state) => state.activeId);
  const setActive = useVibeChartStore((state) => state.setActive);
  const addDocument = useVibeChartStore((state) => state.addDocument);
  const duplicateDocument = useVibeChartStore(
    (state) => state.duplicateDocument,
  );
  const deleteDocument = useVibeChartStore((state) => state.deleteDocument);

  return (
    <aside className="document-sidebar" aria-label={t("diagramDirectory")}>
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <GitBranch size={20} weight="bold" />
        </div>
        <div>
          <strong>Vibe Chart</strong>
          <span>{t("diagramStudio")}</span>
        </div>
      </div>

      <details className="new-diagram-menu">
        <summary>
          <Plus size={15} weight="bold" />
          {t("newDiagram")}
        </summary>
        <div className="new-diagram-popover">
          {createOptions.map(({ kind, labelKey }) => {
            const Icon = kindIcon[kind];
            return (
              <button type="button" key={kind} onClick={() => addDocument(kind)}>
                <Icon size={16} />
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </details>

      <div className="sidebar-section-label">
        <span>{t("workspace")}</span>
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
                  {t(document.kind === "er" ? "erDiagram" : document.kind)} · {t("nodes", { count: document.nodes.length })}
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
          title={t("duplicateCurrentDiagram")}
        >
          <Copy size={15} />
          {t("duplicate")}
        </button>
        <button
          type="button"
          onClick={() => deleteDocument(activeId)}
          title={t("deleteCurrentDiagram")}
        >
          <Trash size={15} />
          {t("delete")}
        </button>
      </div>
      <p className="local-note">{t("savedLocally")}</p>
    </aside>
  );
}
