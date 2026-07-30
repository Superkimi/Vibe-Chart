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

const quickPrompts = [
  "Turn this into a clean three-tier architecture",
  "Add failure handling and a retry path",
  "Reduce crossings and improve the layout",
];

export function AiPanel() {
  const diagram = useVibeChartStore(selectActiveDocument);
  const replaceActive = useVibeChartStore((state) => state.replaceActive);
  const autoLayout = useVibeChartStore((state) => state.autoLayout);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Describe the outcome you want. I will edit the graph structure and keep the result reversible.",
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
      const response = await fetch("/api/ai/chart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...settings,
          prompt: text,
          diagram,
          history: nextMessages
            .filter((message) => message.id !== "welcome")
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
        throw new Error(result.error || result.detail || "AI edit failed.");
      }
      replaceActive(validateDiagram(result.diagram));
      window.setTimeout(() => autoLayout(), 0);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.summary || "The diagram has been updated.",
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
            error instanceof Error ? error.message : "Could not apply AI edit.",
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
            <strong>Vibe with your chart</strong>
            <small>{settings.model}</small>
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Configure model"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <GearSix size={17} />
        </button>
      </header>

      {settingsOpen ? (
        <section className="model-settings" aria-label="Model settings">
          <label>
            Provider endpoint
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
            Model
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
            API key
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  apiKey: event.target.value,
                }))
              }
              placeholder="Stored for this tab only"
            />
          </label>
          <p>
            Your key stays in session storage and is sent only when you request
            an edit.
          </p>
          <button type="button" className="primary-action" onClick={saveSettings}>
            Save model
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
                  Applied to canvas
                </small>
              ) : null}
              {message.state === "error" ? (
                <small>
                  <WarningCircle size={13} weight="fill" />
                  Check model settings
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
              <p>Reading structure and planning a safe edit…</p>
              <span className="thinking-line" />
            </div>
          </article>
        ) : null}
        <div ref={endRef} />
      </div>

      {messages.length === 1 ? (
        <div className="quick-prompts">
          {quickPrompts.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setPrompt(item)}
            >
              <span>{item}</span>
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
          placeholder="Add a cache, split the payment flow, simplify the ER model…"
          aria-label="Describe a diagram change"
          rows={3}
        />
        <div>
          <span>Enter to send · Shift+Enter for new line</span>
          <button
            type="submit"
            className="send-button"
            disabled={!prompt.trim() || pending}
            aria-label="Send diagram request"
          >
            <PaperPlaneTilt size={16} weight="fill" />
          </button>
        </div>
      </form>
    </div>
  );
}

