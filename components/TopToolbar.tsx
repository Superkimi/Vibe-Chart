"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  BracketsCurly,
  CaretDown,
  CirclesThreePlus,
  Code,
  Database,
  Diamond,
  DownloadSimple,
  FlowArrow,
  Image as ImageIcon,
  Moon,
  Robot,
  Sun,
} from "@phosphor-icons/react";
import { toPng, toSvg } from "html-to-image";
import {
  downloadText,
  toDrawio,
  toMermaid,
} from "@/lib/diagram-code";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";
import type { NodeShape } from "@/lib/diagram-schema";

type ViewMode = "canvas" | "code";

const extensionSafe = (value: string) =>
  value.trim().replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/g, "-") || "diagram";

export function TopToolbar({
  view,
  onViewChange,
}: {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}) {
  const diagram = useVibeChartStore(selectActiveDocument);
  const renameDocument = useVibeChartStore((state) => state.renameDocument);
  const addNode = useVibeChartStore((state) => state.addNode);
  const autoLayout = useVibeChartStore((state) => state.autoLayout);
  const undo = useVibeChartStore((state) => state.undo);
  const redo = useVibeChartStore((state) => state.redo);
  const canUndo = useVibeChartStore((state) => state.past.length > 0);
  const canRedo = useVibeChartStore((state) => state.future.length > 0);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("vibe-chart-theme");
    return saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  });
  const [exporting, setExporting] = useState(false);
  const exportDetails = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("vibe-chart-theme", next);
  };

  const textExport = (format: "mermaid" | "drawio" | "json") => {
    const name = extensionSafe(diagram.title);
    if (format === "mermaid") {
      downloadText(toMermaid(diagram), `${name}.mmd`);
    } else if (format === "drawio") {
      downloadText(
        toDrawio(diagram),
        `${name}.drawio`,
        "application/xml;charset=utf-8",
      );
    } else {
      downloadText(
        JSON.stringify(diagram, null, 2),
        `${name}.vibe-chart.json`,
        "application/json;charset=utf-8",
      );
    }
    exportDetails.current?.removeAttribute("open");
  };

  const imageExport = async (format: "png" | "svg") => {
    const element = document.getElementById("diagram-export-surface");
    if (!element) return;
    setExporting(true);
    try {
      const options = {
        backgroundColor:
          theme === "dark" ? "#15131a" : "#fbfaff",
        pixelRatio: format === "png" ? 2 : 1,
        cacheBust: true,
      };
      const dataUrl =
        format === "png"
          ? await toPng(element, options)
          : await toSvg(element, options);
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `${extensionSafe(diagram.title)}.${format}`;
      anchor.click();
    } finally {
      setExporting(false);
      exportDetails.current?.removeAttribute("open");
    }
  };

  const addShape = (shape: NodeShape) => {
    addNode(shape);
    document
      .querySelector<HTMLDetailsElement>(".add-node-menu")
      ?.removeAttribute("open");
  };

  return (
    <header className="top-toolbar">
      <div className="document-title-area">
        <input
          value={diagram.title}
          onChange={(event) => renameDocument(event.target.value)}
          aria-label="Diagram title"
        />
        <span>Saved</span>
      </div>

      <div className="toolbar-group history-controls">
        <button type="button" onClick={undo} disabled={!canUndo} title="Undo">
          <ArrowCounterClockwise size={16} />
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="Redo">
          <ArrowClockwise size={16} />
        </button>
      </div>

      <div className="view-switch" role="tablist" aria-label="Editor view">
        <button
          type="button"
          className={view === "canvas" ? "is-active" : ""}
          onClick={() => onViewChange("canvas")}
        >
          <CirclesThreePlus size={15} />
          Canvas
        </button>
        <button
          type="button"
          className={view === "code" ? "is-active" : ""}
          onClick={() => onViewChange("code")}
        >
          <Code size={15} />
          Code
        </button>
      </div>

      <div className="toolbar-actions">
        <details className="toolbar-menu add-node-menu">
          <summary>
            <CirclesThreePlus size={16} />
            Add
            <CaretDown size={12} />
          </summary>
          <div className="toolbar-popover">
            <button type="button" onClick={() => addShape("process")}>
              <Robot size={16} />
              Process
            </button>
            <button type="button" onClick={() => addShape("decision")}>
              <Diamond size={16} />
              Decision
            </button>
            <button type="button" onClick={() => addShape("database")}>
              <Database size={16} />
              Database
            </button>
            <button type="button" onClick={() => addShape("service")}>
              <FlowArrow size={16} />
              Service
            </button>
          </div>
        </details>
        <button type="button" onClick={() => autoLayout()}>
          <BracketsCurly size={16} />
          Arrange
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <details className="toolbar-menu export-menu" ref={exportDetails}>
          <summary className="primary-action">
            <DownloadSimple size={16} />
            {exporting ? "Exporting" : "Export"}
            <CaretDown size={12} />
          </summary>
          <div className="toolbar-popover export-popover">
            <button type="button" onClick={() => void imageExport("png")}>
              <ImageIcon size={16} />
              <span>
                <strong>PNG image</strong>
                <small>2x resolution</small>
              </span>
            </button>
            <button type="button" onClick={() => void imageExport("svg")}>
              <ImageIcon size={16} />
              <span>
                <strong>SVG image</strong>
                <small>Scalable vector</small>
              </span>
            </button>
            <button type="button" onClick={() => textExport("drawio")}>
              <FlowArrow size={16} />
              <span>
                <strong>draw.io</strong>
                <small>Editable XML</small>
              </span>
            </button>
            <button type="button" onClick={() => textExport("mermaid")}>
              <Code size={16} />
              <span>
                <strong>Mermaid</strong>
                <small>Diagram as code</small>
              </span>
            </button>
            <button type="button" onClick={() => textExport("json")}>
              <BracketsCurly size={16} />
              <span>
                <strong>Vibe JSON</strong>
                <small>Canonical schema</small>
              </span>
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
