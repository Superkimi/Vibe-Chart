"use client";

import { useEffect, useState } from "react";
import { DiagramCanvas } from "./DiagramCanvas";
import { DocumentSidebar } from "./DocumentSidebar";
import { InspectorPanel } from "./InspectorPanel";
import { TopToolbar } from "./TopToolbar";
import { CodePanel } from "./CodePanel";
import { useVibeChartStore } from "@/lib/store";
import { I18nProvider } from "@/lib/i18n";

export function VibeChartApp() {
  return (
    <I18nProvider>
      <VibeChartShell />
    </I18nProvider>
  );
}

function VibeChartShell() {
  const [view, setView] = useState<"canvas" | "code">("canvas");
  const hydrated = useVibeChartStore((state) => state.hydrated);
  const diagram = useVibeChartStore((state) =>
    state.documents.find((document) => document.id === state.activeId) ??
    state.documents[0],
  );
  const activeId = useVibeChartStore((state) => state.activeId);
  const setHydrated = useVibeChartStore((state) => state.setHydrated);
  useEffect(() => {
    if (!hydrated) setHydrated(true);
  }, [hydrated, setHydrated]);

  const effectiveView = diagram.kind === "whiteboard" ? "canvas" : view;

  return (
    <main className="vibe-chart-shell">
      <DocumentSidebar />
      <section className="editor-column">
        <TopToolbar view={effectiveView} onViewChange={setView} />
        <div className="workspace-stage">
          {effectiveView === "canvas" ? (
            <DiagramCanvas />
          ) : (
            <CodePanel key={activeId} />
          )}
        </div>
      </section>
      <InspectorPanel />
    </main>
  );
}
