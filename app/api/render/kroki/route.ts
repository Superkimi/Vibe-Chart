import { z } from "zod";
import {
  getKrokiEngineDefinition,
  isKrokiEngine,
  krokiEngineDefinitions,
  krokiEngineIds,
  type KrokiEngineId,
  type KrokiOutputFormat,
} from "@/lib/kroki";

export const runtime = "edge";

const DEFAULT_ENGINES: readonly KrokiEngineId[] = [
  "plantuml",
  "graphviz",
  "d2",
  "dbml",
];
const MAX_SOURCE_LENGTH = 50_000;
const MAX_REQUEST_LENGTH = 100_000;
const DEFAULT_TIMEOUT_MS = 12_000;

const requestSchema = z.object({
  engine: z.enum(krokiEngineIds),
  format: z.enum(["svg", "png", "jpeg", "pdf", "txt"]),
  source: z.string().min(1).max(MAX_SOURCE_LENGTH),
  options: z
    .record(
      z.string().min(1).max(48),
      z.union([z.string().max(160), z.number().finite(), z.boolean()]),
    )
    .default({}),
});

const allowedOptions: Record<KrokiEngineId, readonly string[]> = {
  mermaid: [],
  plantuml: ["theme"],
  graphviz: ["layout", "scale"],
  d2: ["layout", "theme", "dark-theme", "pad", "scale", "sketch"],
  dbml: [],
};

const outputMimeTypes: Record<KrokiOutputFormat, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
};

function environmentValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

function baseUrl() {
  const raw =
    environmentValue("VIBE_CHART_KROKI_BASE_URL") ||
    environmentValue("KROKI_BASE_URL");
  if (!raw) return null;
  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Kroki base URL must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Kroki base URL must not contain credentials or query parameters.");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function enabledEngines() {
  const configured = environmentValue("VIBE_CHART_KROKI_ENGINES");
  const values = configured
    ? configured.split(",").map((value) => value.trim().toLowerCase())
    : DEFAULT_ENGINES;
  return values.filter(
    (value, index, all): value is KrokiEngineId =>
      isKrokiEngine(value) && all.indexOf(value) === index,
  );
}

function timeoutMs() {
  const parsed = Number(environmentValue("VIBE_CHART_KROKI_TIMEOUT_MS"));
  return Number.isFinite(parsed)
    ? Math.min(30_000, Math.max(1_000, parsed))
    : DEFAULT_TIMEOUT_MS;
}

function cacheVersion() {
  return environmentValue("VIBE_CHART_KROKI_VERSION") || "unknown";
}

function jsonError(message: string, status: number, detail?: string) {
  return Response.json(
    { error: message, ...(detail ? { detail: detail.slice(0, 500) } : {}) },
    { status },
  );
}

async function etagFor(
  engine: KrokiEngineId,
  format: KrokiOutputFormat,
  source: string,
  options: Record<string, unknown>,
) {
  const payload = JSON.stringify({
    version: cacheVersion(),
    engine,
    format,
    source,
    options,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  const bytes = Array.from(new Uint8Array(digest));
  return `"vibe-kroki-${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
}

function validateOptions(engine: KrokiEngineId, options: Record<string, unknown>) {
  const allowed = allowedOptions[engine];
  for (const key of Object.keys(options)) {
    if (!allowed.includes(key)) {
      throw new Error(`Option ${key} is not available for ${engine}.`);
    }
  }
  return options;
}

export async function GET() {
  try {
    const configured = Boolean(baseUrl());
    const engines = enabledEngines();
    return Response.json({
      configured,
      engines: configured
        ? krokiEngineDefinitions
            .filter((definition) => engines.includes(definition.id))
            .map((definition) => ({
              engine: definition.id,
              label: definition.label,
              formats: definition.formats,
              kinds: definition.kinds,
            }))
        : [],
      timeoutMs: timeoutMs(),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Kroki configuration is invalid.",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_REQUEST_LENGTH) {
      return jsonError("Kroki render request is too large.", 413);
    }
    const input = requestSchema.parse(await request.json());
    const endpoint = baseUrl();
    if (!endpoint) {
      return jsonError("Kroki rendering is not configured on this deployment.", 503);
    }
    const engines = enabledEngines();
    if (!engines.includes(input.engine)) {
      return jsonError(`Kroki engine ${input.engine} is not enabled.`, 400);
    }
    const definition = getKrokiEngineDefinition(input.engine);
    if (!definition.formats.includes(input.format)) {
      return jsonError(
        `${input.engine} does not support ${input.format} output.`,
        400,
      );
    }
    const options = validateOptions(input.engine, input.options);
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      query.set(key, String(value));
    }
    const path = `${endpoint}/${input.engine}/${input.format}`;
    const upstreamUrl = query.size ? `${path}?${query}` : path;
    const etag = await etagFor(input.engine, input.format, input.source, options);
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=300",
        },
      });
    }
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: outputMimeTypes[input.format],
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: input.source,
      signal: AbortSignal.timeout(timeoutMs()),
    });
    if (!response.ok) {
      return jsonError(
        `Kroki ${input.engine} rendering failed (${response.status}).`,
        response.status >= 400 && response.status < 500 ? 422 : 502,
        await response.text(),
      );
    }
    const headers = new Headers();
    headers.set(
      "Content-Type",
      response.headers.get("content-type") || outputMimeTypes[input.format],
    );
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("ETag", etag);
    headers.set("X-Vibe-Renderer", "kroki");
    return new Response(await response.arrayBuffer(), { headers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        error.issues.map((issue) => issue.message).join("; "),
        400,
      );
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return jsonError("Kroki rendering timed out.", 504);
    }
    return jsonError(
      error instanceof Error ? error.message : "Kroki rendering failed.",
      400,
    );
  }
}
