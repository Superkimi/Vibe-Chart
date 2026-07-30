"use client";

import { useEffect, useState } from "react";
import { DiagramCanvas } from "./DiagramCanvas";
import { DocumentSidebar } from "./DocumentSidebar";
import { InspectorPanel } from "./InspectorPanel";
import { TopToolbar } from "./TopToolbar";
import { CodePanel } from "./CodePanel";
import { useVibeChartStore } from "@/lib/store";

export function VibeChartApp() {
  const [view, setView] = useState<"canvas" | "code">("canvas");
  const hydrated = useVibeChartStore((state) => state.hydrated);
  const activeId = useVibeChartStore((state) => state.activeId);
  const setHydrated = useVibeChartStore((state) => state.setHydrated);

  useEffect(() => {
    if (!hydrated) setHydrated(true);
  }, [hydrated, setHydrated]);

  if (!hydrated) {
    return (
      <main className="app-loading">
        <div className="loading-mark" />
        <strong>Preparing your diagram workspace</strong>
      </main>
    );
  }

  return (
    <main className="vibe-chart-shell">
      <DocumentSidebar />
      <section className="editor-column">
        <TopToolbar view={view} onViewChange={setView} />
        <div className="workspace-stage">
          {view === "canvas" ? (
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
