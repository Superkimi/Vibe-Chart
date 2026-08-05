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
  FilmStrip,
  FlowArrow,
  Image as ImageIcon,
  Moon,
  Robot,
  Sun,
  Translate,
} from "@phosphor-icons/react";
import { toPng, toSvg } from "html-to-image";
import {
  downloadText,
  toDrawio,
  toMermaid,
} from "@/lib/diagram-code";
import { exportMotion } from "@/lib/motion-export";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { diagramKinds, type NodeShape } from "@/lib/diagram-schema";

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
  const { locale, setLocale, t } = useI18n();
  const diagram = useVibeChartStore(selectActiveDocument);
  const renameDocument = useVibeChartStore((state) => state.renameDocument);
  const addNode = useVibeChartStore((state) => state.addNode);
  const addMindMapBranch = useVibeChartStore((state) => state.addMindMapBranch);
  const changeKind = useVibeChartStore((state) => state.changeKind);
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
  const [exportError, setExportError] = useState("");
  const exportDetails = useRef<HTMLDetailsElement>(null);
  const isWhiteboard = diagram.kind === "whiteboard";
  const isMindMap = diagram.kind === "mindmap";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("vibe-chart-theme", next);
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "zh" : "en");
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

  const motionExport = async (format: "webm" | "gif") => {
    setExporting(true);
    setExportError("");
    let succeeded = false;
    try {
      const blob = await exportMotion(diagram, format, {
        backgroundColor: theme === "dark" ? "#15131a" : "#fbfaff",
        foregroundColor: theme === "dark" ? "#b2aabb" : "#716a7b",
        accentColor: theme === "dark" ? "#a995dc" : "#6650a4",
      });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${extensionSafe(diagram.title)}.${format}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
      succeeded = true;
    } catch (error) {
      setExportError(
        error instanceof Error && error.message.includes("unavailable")
          ? t("motionExportUnavailable")
          : t("motionExportFailed"),
      );
    } finally {
      setExporting(false);
      if (succeeded) exportDetails.current?.removeAttribute("open");
    }
  };

  const addShape = (shape: NodeShape) => {
    addNode(shape);
    document
      .querySelector<HTMLDetailsElement>(".add-node-menu")
      ?.removeAttribute("open");
  };

  const addMindMapBranchAndClose = () => {
    addMindMapBranch();
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
          aria-label={t("diagramTitle")}
        />
        <span>{t("saved")}</span>
      </div>

      <div className="toolbar-group history-controls">
        <button type="button" onClick={undo} disabled={!canUndo} title={t("undo")}>
          <ArrowCounterClockwise size={16} />
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title={t("redo")}>
          <ArrowClockwise size={16} />
        </button>
      </div>

      <div className="view-switch" role="tablist" aria-label={t("editorView")}>
        <button
          type="button"
          className={view === "canvas" ? "is-active" : ""}
          onClick={() => onViewChange("canvas")}
        >
          <CirclesThreePlus size={15} />
          {t("canvas")}
        </button>
        {!isWhiteboard ? (
          <button
            type="button"
            className={view === "code" ? "is-active" : ""}
            onClick={() => onViewChange("code")}
          >
            <Code size={15} />
            {t("code")}
          </button>
        ) : null}
      </div>

      <label className="diagram-kind-picker">
        <span>{t("diagramType")}</span>
        <select
          value={diagram.kind}
          aria-label={t("diagramType")}
          onChange={(event) => changeKind(event.target.value as (typeof diagramKinds)[number])}
        >
          {diagramKinds.map((kind) => (
            <option value={kind} key={kind}>
              {t(kind === "er" ? "erDiagram" : kind)}
            </option>
          ))}
        </select>
      </label>

      <div className="toolbar-actions">
        {!isWhiteboard ? <details className="toolbar-menu add-node-menu">
          <summary>
            <CirclesThreePlus size={16} />
            {t("add")}
            <CaretDown size={12} />
          </summary>
          <div className="toolbar-popover">
            {isMindMap ? (
              <button type="button" onClick={addMindMapBranchAndClose}>
                <FlowArrow size={16} />
                {t("newMindmapBranch")}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => addShape("process")}>
                  <Robot size={16} />
                  {t("process")}
                </button>
                <button type="button" onClick={() => addShape("decision")}>
                  <Diamond size={16} />
                  {t("decision")}
                </button>
                <button type="button" onClick={() => addShape("database")}>
                  <Database size={16} />
                  {t("database")}
                </button>
                <button type="button" onClick={() => addShape("service")}>
                  <FlowArrow size={16} />
                  {t("service")}
                </button>
              </>
            )}
          </div>
        </details> : null}
        {!isWhiteboard ? <button type="button" onClick={() => autoLayout()}>
          <BracketsCurly size={16} />
          {t("arrange")}
        </button> : null}
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={
            theme === "light" ? t("useDarkTheme") : t("useLightTheme")
          }
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button
          type="button"
          className="language-toggle"
          onClick={toggleLocale}
          aria-label={t("switchLanguage")}
          title={t("switchLanguage")}
        >
          <Translate size={16} />
          <span>{locale === "en" ? t("chinese") : t("english")}</span>
        </button>
        <details className="toolbar-menu export-menu" ref={exportDetails}>
          <summary className="primary-action">
            <DownloadSimple size={16} />
            {exporting ? t("exporting") : t("export")}
            <CaretDown size={12} />
          </summary>
          <div className="toolbar-popover export-popover">
            <button type="button" onClick={() => void imageExport("png")}>
              <ImageIcon size={16} />
              <span>
                <strong>{t("pngImage")}</strong>
                <small>{t("twoXResolution")}</small>
              </span>
            </button>
            <button type="button" onClick={() => void imageExport("svg")}>
              <ImageIcon size={16} />
              <span>
                <strong>{t("svgImage")}</strong>
                <small>{t("scalableVector")}</small>
              </span>
            </button>
            <button type="button" onClick={() => textExport("drawio")}>
              <FlowArrow size={16} />
              <span>
                <strong>{t("drawio")}</strong>
                <small>{t("editableXml")}</small>
              </span>
            </button>
            {!isWhiteboard ? (
              <button type="button" onClick={() => textExport("mermaid")}>
                <Code size={16} />
                <span>
                  <strong>{t("mermaid")}</strong>
                  <small>{t("diagramAsCode")}</small>
                </span>
              </button>
            ) : null}
            <button type="button" onClick={() => textExport("json")}>
              <BracketsCurly size={16} />
              <span>
                <strong>{t("vibeJson")}</strong>
                <small>{t("canonicalSchema")}</small>
              </span>
            </button>
            {!isWhiteboard ? (
              <button type="button" onClick={() => void motionExport("webm")}>
                <FilmStrip size={16} />
                <span>
                  <strong>{t("webmVideo")}</strong>
                  <small>{t("motionExport")}</small>
                </span>
              </button>
            ) : null}
            {!isWhiteboard ? (
              <button type="button" onClick={() => void motionExport("gif")}>
                <FilmStrip size={16} />
                <span>
                  <strong>{t("gifImage")}</strong>
                  <small>{t("motionExport")}</small>
                </span>
              </button>
            ) : null}
            {exportError ? (
              <p className="toolbar-export-error" role="status">
                {exportError}
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </header>
  );
}
