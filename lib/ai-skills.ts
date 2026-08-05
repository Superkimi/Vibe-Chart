import type { DiagramKind } from "./diagram-schema";

const coreSkill = `You are Vibe Chart's schema-first diagram editor. Work on the supplied typed graph, not prose.

Return exactly one JSON object with a short "summary" and either:
- "diagram": a complete updated DiagramDocument for a new diagram or a major restructure; or
- "operations": a short list of ID-addressed operations for a targeted edit.

Use operations when the user asks to rename, add, remove, relabel, recolor, animate, or otherwise adjust a small part. Preserve every unrelated node and edge. Use the complete diagram only when structure changes substantially.

Stable graph rules:
- Preserve a node id when its concept remains. New ids must match ^[A-Za-z][A-Za-z0-9_-]*$.
- Every edge source and target must exist. Never invent an id for an update/remove operation.
- One node represents one responsibility; put explanation in subtitle instead of creating filler nodes.
- Keep the primary path readable, avoid crossings, and let the client perform the final Dagre layout.
- Valid shapes: service, process, decision, database, external, actor, entity.
- Valid tones: lilac, slate, cyan, amber, rose.
- ER fields use "type name constraint" strings such as "uuid id PK".
- Never return markdown fences, comments, arbitrary keys, executable code, or provider-specific XML.`;

const kindSkills: Record<DiagramKind, string> = {
  architecture: `Architecture skill: use 5-14 meaningful components, group the flow left-to-right, and distinguish actors/external systems, services, data stores, and queues by shape and tone. Keep one clear request path and add failure paths only when requested.`,
  flowchart: `Flowchart skill: use process nodes for actions and decision nodes for branches. Prefer TB for decision-heavy flows. Every branch should have a concise edge label and a reachable end state.`,
  er: `ER skill: use entity nodes with compact fields and edges that describe relationships. Keep fields to identifiers and important constraints; do not turn every column into a separate node.`,
  sequence: `Sequence skill: arrange participants left-to-right and interactions in a readable top-to-bottom order. Keep labels short and preserve message direction in edge source/target order.`,
};

const motionSkill = `Motion skill: only add a motion plan when the user explicitly asks for animation, flow, pulse, a story, or a video/GIF. The motion plan is presentation metadata separate from graph topology. Use motion.enabled, mode (trace or story), a finite durationMs between 500 and 15000, and steps containing stable nodeIds/edgeIds, durationMs, and an optional caption. For a targeted edit use a set_motion operation. You may also set an edge's animated flag for a simple connector hint. Never return animation code, callbacks, arbitrary selectors, CSS, or executable JavaScript.`;

function asksForMotion(prompt: string) {
  return /animate|animated|animation|motion|pulse|流动|动画|动效|脉冲/i.test(prompt);
}

export function buildDiagramSystemPrompt({
  kind,
  prompt,
  locale,
}: {
  kind: DiagramKind;
  prompt: string;
  locale: "en" | "zh";
}) {
  const skills = [coreSkill, kindSkills[kind]];
  if (asksForMotion(prompt)) skills.push(motionSkill);
  skills.push(
    `Write the summary in ${locale === "zh" ? "Simplified Chinese" : "English"}. The current document is ${kind}; respect its existing intent unless the user asks to change the type.`,
  );
  return skills.join("\n\n");
}
