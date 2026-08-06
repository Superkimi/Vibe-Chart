import { withBasePath } from "./runtime-path";
import type { KrokiEngineId, KrokiOutputFormat } from "./kroki";

export type KrokiCapabilities = {
  configured: boolean;
  engines: Array<{
    engine: KrokiEngineId;
    label: string;
    formats: KrokiOutputFormat[];
    kinds: string[];
  }>;
  timeoutMs: number;
};

export async function fetchKrokiCapabilities(): Promise<KrokiCapabilities> {
  const response = await fetch(withBasePath("/api/render/kroki"), {
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as KrokiCapabilities & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Kroki capabilities are unavailable.");
  }
  return payload;
}

export async function renderWithKroki(input: {
  engine: KrokiEngineId;
  format: KrokiOutputFormat;
  source: string;
  options?: Record<string, string | number | boolean>;
}) {
  const response = await fetch(withBasePath("/api/render/kroki"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    let message = `Kroki render failed (${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: string; detail?: string };
      message = payload.error || message;
      if (payload.detail) message = `${message} ${payload.detail}`;
    } catch {
      // Keep the status-based message when the server did not return JSON.
    }
    throw new Error(message);
  }
  return {
    blob: await response.blob(),
    etag: response.headers.get("etag"),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}
