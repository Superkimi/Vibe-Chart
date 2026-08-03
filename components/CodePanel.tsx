"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise, Check, Copy } from "@phosphor-icons/react";
import { fromMermaid, toMermaid } from "@/lib/diagram-code";
import { useI18n } from "@/lib/i18n";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";

export function CodePanel() {
  const { t } = useI18n();
  const diagram = useVibeChartStore(selectActiveDocument);
  const replaceActive = useVibeChartStore((state) => state.replaceActive);
  const generated = useMemo(() => toMermaid(diagram), [diagram]);
  const [draftSource, setDraftSource] = useState<string | null>(null);
  const source = draftSource ?? generated;
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            primaryColor: "#eee9f8",
            primaryTextColor: "#292530",
            primaryBorderColor: "#6650a4",
            lineColor: "#756b83",
            fontFamily: "Geist Variable",
            background: "#fbfaff",
          },
        });
        const { svg } = await mermaid.render(
          `vibe-chart-${diagram.id.replace(/[^A-Za-z0-9]/g, "")}`,
          source,
        );
        if (!cancelled && previewRef.current) {
          previewRef.current.innerHTML = svg;
          setError("");
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : t("mermaidRenderFallback"),
          );
        }
      }
    };
    const timeout = window.setTimeout(render, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [source, diagram.id, t]);

  const applyCode = () => {
    try {
      replaceActive(fromMermaid(source, diagram));
      setDraftSource(null);
      setError("");
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : t("mermaidApplyFallback"),
      );
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="code-workbench">
      <div className="code-editor-pane">
        <header>
          <div>
            <strong>{t("mermaidSource")}</strong>
            <span>{t("codeSyncHint")}</span>
          </div>
          <div className="code-actions">
            <button
              type="button"
              onClick={() => {
                setDraftSource(null);
              }}
            >
              <ArrowClockwise size={14} />
              {t("reset")}
            </button>
            <button type="button" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </header>
        <textarea
          aria-label={t("mermaidCode")}
          spellCheck={false}
          value={source}
          onChange={(event) => {
            setDraftSource(event.target.value);
          }}
        />
        <footer>
          <span className={error ? "code-status error" : "code-status"}>
            {error || t("syntaxValid")}
          </span>
          <button type="button" className="primary-action" onClick={applyCode}>
            {t("applyCanvas")}
          </button>
        </footer>
      </div>
      <div className="mermaid-preview-pane">
        <header>
          <strong>{t("renderedPreview")}</strong>
          <span>{t("strictSecurity")}</span>
        </header>
        <div ref={previewRef} className="mermaid-preview" />
      </div>
    </section>
  );
}
