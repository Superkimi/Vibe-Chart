import { z } from "zod";
import {
  diagramDocumentSchema,
  type DiagramDocument,
} from "@/lib/diagram-schema";

export const runtime = "edge";

const requestSchema = z.object({
  baseUrl: z.union([z.literal(""), z.string().url().max(300)]).default(""),
  apiKey: z.string().max(500).optional().default(""),
  model: z.string().min(1).max(120),
  locale: z.enum(["en", "zh"]).default("en"),
  prompt: z.string().min(2).max(4000),
  diagram: diagramDocumentSchema,
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(12)
    .default([]),
});

const isPrivateHostname = (hostname: string) => {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower === "0.0.0.0" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    /^10\./.test(lower) ||
    /^192\.168\./.test(lower) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(lower) ||
    /^169\.254\./.test(lower)
  );
};

function modelEndpoint(baseUrl: string) {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && !isPrivateHostname(url.hostname)) {
    throw new Error("Model endpoint must use HTTPS.");
  }
  if (isPrivateHostname(url.hostname) && process.env.NODE_ENV === "production") {
    throw new Error("Private network model endpoints are disabled in production.");
  }
  if (url.username || url.password) {
    throw new Error("Credentials are not allowed in the endpoint URL.");
  }
  url.search = "";
  url.hash = "";
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.endsWith("/chat/completions")
    ? path
    : `${path}/chat/completions`;
  return url.toString();
}

const SYSTEM_PROMPT = `You are Vibe Chart's diagram planner. Modify the supplied diagram as a typed graph, not as prose.

Return exactly one JSON object with:
{
  "summary": "short user-facing description",
  "diagram": <complete updated diagram>
}

Diagram quality rules:
- Preserve stable node ids when a concept remains. Use ids matching ^[A-Za-z][A-Za-z0-9_-]*$.
- Keep architecture diagrams to 5-14 meaningful nodes unless the user asks for detail.
- One node represents one responsibility. Put explanation in subtitle, not extra nodes.
- Every edge must reference existing nodes. Prefer a readable primary path and avoid unnecessary crossing.
- Use LR for architecture and sequence, TB for decision-heavy flows unless requested otherwise.
- Valid shapes: service, process, decision, database, external, actor, entity.
- Valid tones: lilac, slate, cyan, amber, rose.
- For ER entities, fields are strings in "type name constraint" form, for example "uuid id PK".
- Positions are editable canvas coordinates. Spread nodes by at least 230px horizontally and 130px vertically.
- Treat the user's request as an edit to the current graph. Never discard unrelated correct content.
- Do not include markdown fences, comments, or any keys outside summary and diagram.`;

function extractJson(content: string) {
  const fenced = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("The model did not return a JSON diagram.");
  }
  return JSON.parse(fenced.slice(start, end + 1)) as unknown;
}

function normalizeDiagram(
  candidate: DiagramDocument,
  current: DiagramDocument,
) {
  return diagramDocumentSchema.parse({
    ...candidate,
    id: current.id,
    revision: current.revision,
    updatedAt: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const apiKey = input.apiKey || process.env.VIBE_CHART_API_KEY || "";
    const baseUrl =
      input.baseUrl ||
      process.env.VIBE_CHART_BASE_URL ||
      "https://api.openai.com/v1";
    const response = await fetch(modelEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: input.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n- Write the summary in ${input.locale === "zh" ? "Simplified Chinese" : "English"}.`,
          },
          ...input.history.slice(-8),
          {
            role: "user",
            content: `${input.prompt}\n\nCurrent diagram JSON:\n${JSON.stringify(input.diagram)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return Response.json(
        {
          error: `Model request failed (${response.status}).`,
          detail: detail.slice(0, 500),
        },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("The model returned an empty response.");
    const parsed = z
      .object({
        summary: z.string().min(1).max(500),
        diagram: diagramDocumentSchema,
      })
      .parse(extractJson(content));

    return Response.json({
      summary: parsed.summary,
      diagram: normalizeDiagram(parsed.diagram, input.diagram),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json(
        { error: "The model request timed out after 45 seconds." },
        { status: 504 },
      );
    }
    const message =
      error instanceof z.ZodError
        ? error.issues.map((issue) => issue.message).join("; ")
        : error instanceof Error
          ? error.message
          : "Unknown AI request error.";
    return Response.json({ error: message }, { status: 400 });
  }
}
