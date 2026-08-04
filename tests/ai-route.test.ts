import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai/chart/route";
import { starterDocuments } from "@/lib/templates";

describe("AI diagram route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("proxies an OpenAI-compatible request and normalizes the revision", async () => {
    const current = structuredClone(starterDocuments[0]);
    const candidate = structuredClone(current);
    candidate.title = "Updated architecture";
    candidate.revision = 999;
    const providerFetch = vi.fn().mockResolvedValue(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Updated the architecture.",
                diagram: candidate,
              }),
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", providerFetch);

    const response = await POST(
      new Request("http://localhost/api/ai/chart", {
        method: "POST",
        body: JSON.stringify({
          baseUrl: "https://models.example.com/v1?ignored=true",
          apiKey: "session-key",
          model: "diagram-model",
          locale: "zh",
          prompt: "Improve the diagram",
          diagram: current,
          history: [],
        }),
      }),
    );
    const result = (await response.json()) as {
      diagram: { id: string; revision: number };
    };

    expect(response.status).toBe(200);
    expect(result.diagram.id).toBe(current.id);
    expect(result.diagram.revision).toBe(current.revision);
    expect(providerFetch).toHaveBeenCalledOnce();
    const [endpoint, options] = providerFetch.mock.calls[0];
    expect(endpoint).toBe("https://models.example.com/v1/chat/completions");
    expect(options.headers.authorization).toBe("Bearer session-key");
    const body = JSON.parse(options.body);
    expect(body.response_format).toBeUndefined();
    expect(body.messages[0].content).toContain("Simplified Chinese");
    expect(body.messages.at(-1).content).toContain("Current diagram JSON");
  });

  it("rejects a model graph with dangling connections", async () => {
    const candidate = structuredClone(starterDocuments[0]);
    candidate.edges[0].target = "missing";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Broken graph",
                  diagram: candidate,
                }),
              },
            },
          ],
        }),
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/ai/chart", {
        method: "POST",
        body: JSON.stringify({
          baseUrl: "https://models.example.com/v1",
          model: "diagram-model",
          prompt: "Break it",
          diagram: starterDocuments[0],
          history: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("missing node"),
    });
  });

  it("applies an ID-addressed operation without requiring a full graph rewrite", async () => {
    const current = structuredClone(starterDocuments[0]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Renamed the client.",
                  operations: [
                    {
                      op: "update_node",
                      id: current.nodes[0].id,
                      patch: { label: "Renamed client" },
                    },
                  ],
                }),
              },
            },
          ],
        }),
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/ai/chart", {
        method: "POST",
        body: JSON.stringify({
          baseUrl: "https://models.example.com/v1",
          model: "diagram-model",
          prompt: "Rename the first node",
          diagram: current,
          history: [],
        }),
      }),
    );
    const result = (await response.json()) as {
      editMode: string;
      diagram: { nodes: Array<{ data: { label: string } }> };
    };

    expect(response.status).toBe(200);
    expect(result.editMode).toBe("operations");
    expect(result.diagram.nodes[0].data.label).toBe("Renamed client");
    expect(result.diagram.nodes[1].data.label).toBe(current.nodes[1].data.label);
  });
});
