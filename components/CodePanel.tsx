"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise, Check, Copy } from "@phosphor-icons/react";
import { fromMermaid, toMermaid } from "@/lib/diagram-code";
import {
  getKrokiEngineDefinition,
  krokiEngineDefinitions,
  supportsKrokiEngine,
  toKrokiSource,
  type KrokiEngineId,
  type KrokiOutputFormat,
} from "@/lib/kroki";
import {
  fetchKrokiCapabilities,
  renderWithKroki,
  type KrokiCapabilities,
} from "@/lib/kroki-client";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";

type PreviewEngine = "mermaid" | KrokiEngineId;

const safeFileName = (value: string) =>
  value.trim().replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/g, "-") || "diagram";

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
  const [previewEngine, setPreviewEngine] = useState<PreviewEngine>("mermaid");
  const [capabilities, setCapabilities] = useState<KrokiCapabilities | null>(null);
  const [capabilityError, setCapabilityError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchKrokiCapabilities()
      .then((result) => {
        if (!cancelled) {
          setCapabilities(result);
          setCapabilityError("");
        }
      })
      .catch((capabilityRequestError) => {
        if (!cancelled) {
          setCapabilityError(
            capabilityRequestError instanceof Error
              ? capabilityRequestError.message
              : t("krokiUnavailable"),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const activePreviewEngine: PreviewEngine =
    previewEngine === "mermaid" || supportsKrokiEngine(diagram, previewEngine)
      ? previewEngine
      : "mermaid";

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

  const krokiSourceResult = useMemo(() => {
    if (activePreviewEngine === "mermaid") return { source: "", error: "" };
    try {
      return {
        source: toKrokiSource(diagram, activePreviewEngine),
        error: "",
      };
    } catch (sourceError) {
      return {
        source: "",
        error:
          sourceError instanceof Error
            ? sourceError.message
            : t("krokiSourceFailed"),
      };
    }
  }, [activePreviewEngine, diagram, t]);

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
          <div className="preview-heading">
            <strong>{t("renderedPreview")}</strong>
            <span>
              {activePreviewEngine === "mermaid"
                ? t("strictSecurity")
                : t("serverRendered")}
            </span>
          </div>
          <label className="renderer-picker">
            <span>{t("krokiRenderer")}</span>
            <select
              value={activePreviewEngine}
              aria-label={t("selectRenderer")}
              onChange={(event) =>
                setPreviewEngine(event.target.value as PreviewEngine)
              }
            >
              <option value="mermaid">{t("localMermaid")}</option>
              {krokiEngineDefinitions
                .filter((definition) => definition.id !== "mermaid")
                .map((definition) => {
                  const configured = Boolean(
                    capabilities?.configured &&
                      capabilities.engines.some(
                        (engine) => engine.engine === definition.id,
                      ),
                  );
                  const supported = supportsKrokiEngine(
                    diagram,
                    definition.id,
                  );
                  return (
                    <option
                      value={definition.id}
                      key={definition.id}
                      disabled={!configured || !supported}
                    >
                      {definition.label}
                      {!configured ? ` · ${t("notConfigured")}` : ""}
                    </option>
                  );
                })}
            </select>
          </label>
        </header>
        {activePreviewEngine === "mermaid" ? (
          <div ref={previewRef} className="mermaid-preview" />
        ) : (
          <KrokiPreview
            capabilities={capabilities}
            capabilityError={capabilityError}
            diagramTitle={diagram.title}
            engine={activePreviewEngine}
            source={krokiSourceResult.source}
            sourceError={krokiSourceResult.error}
            t={t}
          />
        )}
      </div>
    </section>
  );
}

function KrokiPreview({
  capabilities,
  capabilityError,
  diagramTitle,
  engine,
  source,
  sourceError,
  t,
}: {
  capabilities: KrokiCapabilities | null;
  capabilityError: string;
  diagramTitle: string;
  engine: KrokiEngineId;
  source: string;
  sourceError: string;
  t: (key: TranslationKey) => string;
}) {
  const [renderResult, setRenderResult] = useState<{
    key: string;
    imageUrl: string;
    error: string;
  } | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const definition = getKrokiEngineDefinition(engine);
  const configuredEngine = Boolean(
    capabilities?.configured &&
      capabilities.engines.some((item) => item.engine === engine),
  );
  const renderKey = [
    engine,
    source,
    sourceError,
    capabilityError,
    capabilities?.configured ? "configured" : "not-configured",
    configuredEngine ? "enabled" : "disabled",
  ].join("\u0000");
  const currentResult = renderResult?.key === renderKey ? renderResult : null;
  const imageUrl = currentResult?.imageUrl ?? "";
  const renderError =
    sourceError ||
    (!capabilities?.configured
        ? capabilityError || t("krokiNotConfigured")
      : !configuredEngine
        ? t("rendererUnavailable")
        : currentResult?.error || "");
  const rendering = !renderError && !currentResult;

  useEffect(() => {
    if (renderError || !source) {
      return;
    }
    let cancelled = false;
    renderWithKroki({ engine, format: "svg", source })
      .then(({ blob }) => {
        if (cancelled) return;
        setRenderResult({
          key: renderKey,
          imageUrl: URL.createObjectURL(blob),
          error: "",
        });
      })
      .catch((renderRequestError) => {
        if (!cancelled) {
          setRenderResult({
            key: renderKey,
            imageUrl: "",
            error:
              renderRequestError instanceof Error
                ? renderRequestError.message
                : t("krokiRenderFailed"),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    engine,
    renderError,
    renderKey,
    source,
    t,
  ]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const download = async (format: KrokiOutputFormat) => {
    setDownloadError("");
    try {
      const { blob } = await renderWithKroki({ engine, format, source });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFileName(diagramTitle)}.${format}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setDownloadError(
        downloadError instanceof Error
          ? downloadError.message
          : t("krokiRenderFailed"),
      );
    }
  };

  return (
    <div className="kroki-preview">
      <div className="kroki-preview-toolbar">
        <span>
          {rendering
            ? t("krokiRendering")
            : downloadError || renderError || t("krokiReady")}
        </span>
        <div>
          {definition.formats
            .filter((format) => ["svg", "png", "pdf"].includes(format))
            .map((format) => (
              <button
                type="button"
                key={format}
                onClick={() => void download(format)}
                disabled={rendering || Boolean(renderError)}
              >
                {format.toUpperCase()}
              </button>
            ))}
        </div>
      </div>
      {imageUrl ? (
        <div className="kroki-image-preview">
          {/* Object URLs cannot be passed through next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={`${definition.label} ${t("renderedPreview")}`} />
        </div>
      ) : (
        <div className="kroki-empty-preview">
          <strong>{definition.label}</strong>
          <p>{renderError || t("krokiRendering")}</p>
          {source ? <pre>{source}</pre> : null}
        </div>
      )}
    </div>
  );
}
