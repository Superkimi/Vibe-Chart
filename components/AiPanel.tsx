"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  GearSix,
  PaperPlaneTilt,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { validateDiagram } from "@/lib/diagram-schema";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { layoutDiagram } from "@/lib/layout";
import { withBasePath } from "@/lib/runtime-path";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  state?: "error" | "applied";
};

type ModelSettings = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

const defaultSettings: ModelSettings = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  apiKey: "",
};

const quickPromptKeys: TranslationKey[] = [
  "quickArchitecture",
  "quickFailure",
  "quickLayout",
];

export function AiPanel() {
  const { locale, t } = useI18n();
  const diagram = useVibeChartStore(selectActiveDocument);
  const replaceDocumentIfUnchanged = useVibeChartStore(
    (state) => state.replaceDocumentIfUnchanged,
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("describeOutcome"),
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ModelSettings>(defaultSettings);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("vibe-chart-model-settings");
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch {
        sessionStorage.removeItem("vibe-chart-model-settings");
      }
    }
  }, []);

  useEffect(() => {
    setMessages((current) =>
      current.length === 1 && current[0].id === "welcome"
        ? [{ ...current[0], content: t("describeOutcome") }]
        : current,
    );
  }, [t]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  const saveSettings = () => {
    sessionStorage.setItem(
      "vibe-chart-model-settings",
      JSON.stringify(settings),
    );
    setSettingsOpen(false);
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || pending) return;
    const requestDiagram = structuredClone(diagram);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt("");
    setPending(true);

    try {
      const response = await fetch(withBasePath("/api/ai/chart"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...settings,
          locale,
          prompt: text,
          diagram: requestDiagram,
          history: nextMessages
            .filter((message) => message.id !== "welcome")
            .slice(0, -1)
            .slice(-8)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const result = (await response.json()) as {
        summary?: string;
        diagram?: unknown;
        error?: string;
        detail?: string;
      };
      if (!response.ok || !result.diagram) {
        throw new Error(result.error || result.detail || t("aiEditFailed"));
      }
      const prepared = layoutDiagram(validateDiagram(result.diagram));
      const outcome = replaceDocumentIfUnchanged(
        requestDiagram.id,
        requestDiagram.revision ?? 0,
        prepared,
      );
      if (outcome === "stale") {
        throw new Error(t("staleDiagram"));
      }
      if (outcome === "missing") {
        throw new Error(t("missingDiagram"));
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.summary || t("diagramUpdated"),
          state: "applied",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error ? error.message : t("aiApplyFailed"),
          state: "error",
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="ai-panel">
      <header className="panel-heading">
        <div>
          <span className="panel-icon">
            <Sparkle size={16} weight="fill" />
          </span>
          <div>
            <strong>{t("vibeWithChart")}</strong>
            <small>{settings.model}</small>
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={t("configureModel")}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <GearSix size={17} />
        </button>
      </header>

      {settingsOpen ? (
        <section className="model-settings" aria-label={t("modelSettings")}>
          <label>
            {t("providerEndpoint")}
            <input
              value={settings.baseUrl}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  baseUrl: event.target.value,
                }))
              }
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label>
            {t("model")}
            <input
              value={settings.model}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  model: event.target.value,
                }))
              }
              placeholder="gpt-4.1-mini"
            />
          </label>
          <label>
            {t("apiKey")}
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  apiKey: event.target.value,
                }))
              }
              placeholder={t("storedForTab")}
            />
          </label>
          <p>{t("keyStorageHint")}</p>
          <button
            type="button"
            className="primary-action"
            onClick={saveSettings}
          >
            {t("saveModel")}
          </button>
        </section>
      ) : null}

      <div className="chat-thread" aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`chat-message ${message.role} ${message.state ?? ""}`}
          >
            {message.role === "assistant" ? (
              <span className="assistant-avatar" aria-hidden="true">
                <Sparkle size={12} weight="fill" />
              </span>
            ) : null}
            <div>
              <p>{message.content}</p>
              {message.state === "applied" ? (
                <small>
                  <CheckCircle size={13} weight="fill" />
                  {t("appliedToCanvas")}
                </small>
              ) : null}
              {message.state === "error" ? (
                <small>
                  <WarningCircle size={13} weight="fill" />
                  {t("checkModelSettings")}
                </small>
              ) : null}
            </div>
          </article>
        ))}
        {pending ? (
          <article className="chat-message assistant thinking">
            <span className="assistant-avatar">
              <Sparkle size={12} weight="fill" />
            </span>
            <div>
              <p>{t("pendingEdit")}</p>
              <span className="thinking-line" />
            </div>
          </article>
        ) : null}
        <div ref={endRef} />
      </div>

      {messages.length === 1 ? (
        <div className="quick-prompts">
          {quickPromptKeys.map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => setPrompt(t(key))}
            >
              <span>{t(key)}</span>
              <ArrowRight size={13} />
            </button>
          ))}
        </div>
      ) : null}

      <form className="chat-composer" onSubmit={submit}>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={t("promptPlaceholder")}
          aria-label={t("describeChange")}
          rows={3}
        />
        <div>
          <span>{t("enterHint")}</span>
          <button
            type="submit"
            className="send-button"
            disabled={!prompt.trim() || pending}
            aria-label={t("sendRequest")}
          >
            <PaperPlaneTilt size={16} weight="fill" />
          </button>
        </div>
      </form>
    </div>
  );
}
