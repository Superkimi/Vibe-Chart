import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/render/kroki/route";

describe("Kroki render route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reports that the optional renderer is disabled when no base URL is configured", async () => {
    vi.stubEnv("VIBE_CHART_KROKI_BASE_URL", "");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ configured: false });
  });

  it("proxies a safe renderer request and emits a source/version ETag", async () => {
    vi.stubEnv("VIBE_CHART_KROKI_BASE_URL", "http://127.0.0.1:30248");
    vi.stubEnv("VIBE_CHART_KROKI_ENGINES", "graphviz");
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response("<svg>ok</svg>", {
        status: 200,
        headers: { "content-type": "image/svg+xml" },
      }),
    );
    vi.stubGlobal("fetch", upstreamFetch);

    const request = () =>
      POST(
        new Request("http://localhost/api/render/kroki", {
          method: "POST",
          body: JSON.stringify({
            engine: "graphviz",
            format: "svg",
            source: "digraph G { a -> b }",
            options: { layout: "dot" },
          }),
        }),
      );
    const response = await request();
    const etag = response.headers.get("etag");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<svg>ok</svg>");
    expect(etag).toMatch(/^"vibe-kroki-/);
    expect(upstreamFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:30248/graphviz/svg?layout=dot",
      expect.objectContaining({ method: "POST" }),
    );

    const cached = await POST(
      new Request("http://localhost/api/render/kroki", {
        method: "POST",
        headers: { "if-none-match": etag! },
        body: JSON.stringify({
          engine: "graphviz",
          format: "svg",
          source: "digraph G { a -> b }",
          options: { layout: "dot" },
        }),
      }),
    );
    expect(cached.status).toBe(304);
    expect(upstreamFetch).toHaveBeenCalledOnce();
  });

  it("rejects renderer options that could override security controls", async () => {
    vi.stubEnv("VIBE_CHART_KROKI_BASE_URL", "http://127.0.0.1:30248");
    vi.stubEnv("VIBE_CHART_KROKI_ENGINES", "plantuml");
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await POST(
      new Request("http://localhost/api/render/kroki", {
        method: "POST",
        body: JSON.stringify({
          engine: "plantuml",
          format: "svg",
          source: "Alice -> Bob: hello",
          options: { securityLevel: "unsafe" },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("securityLevel"),
    });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});
