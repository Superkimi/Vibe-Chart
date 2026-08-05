import type {
  DiagramDocument,
  DiagramMotion,
  MotionStep,
  VibeEdge,
  VibeNode,
} from "./diagram-schema";

export type MotionPoint = { x: number; y: number };

export type MotionTimelineEntry = MotionStep & {
  startMs: number;
  endMs: number;
};

export type MotionFrame = {
  entry: MotionTimelineEntry | null;
  progress: number;
  elapsedMs: number;
  totalMs: number;
};

export const NODE_WIDTH = 206;
export const NODE_HEIGHT = 82;
export const MOTION_DEFAULT_DURATION = 4800;

export function defaultMotion(): DiagramMotion {
  return {
    enabled: false,
    mode: "trace",
    durationMs: MOTION_DEFAULT_DURATION,
    loop: false,
    steps: [],
  };
}

export function getMotion(diagram: DiagramDocument): DiagramMotion {
  return diagram.motion ?? defaultMotion();
}

export function nodeHeight(node: VibeNode): number {
  if (node.data.shape !== "entity") return NODE_HEIGHT;
  return 112 + Math.min(node.data.fields?.length ?? 0, 6) * 16;
}

export function nodeBounds(node: VibeNode) {
  return {
    x: node.position.x,
    y: node.position.y,
    width: NODE_WIDTH,
    height: nodeHeight(node),
  };
}

export function nodeCenter(node: VibeNode): MotionPoint {
  const bounds = nodeBounds(node);
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function cubicPoint(
  start: MotionPoint,
  control1: MotionPoint,
  control2: MotionPoint,
  end: MotionPoint,
  t: number,
): MotionPoint {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * t * control1.x +
      3 * inverse * t ** 2 * control2.x +
      t ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * t * control1.y +
      3 * inverse * t ** 2 * control2.y +
      t ** 3 * end.y,
  };
}

function bezierPoints(start: MotionPoint, end: MotionPoint): MotionPoint[] {
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const bend = horizontal
    ? Math.max(80, Math.abs(end.x - start.x) * 0.42)
    : Math.max(80, Math.abs(end.y - start.y) * 0.42);
  const control1 = horizontal
    ? { x: start.x + Math.sign(end.x - start.x || 1) * bend, y: start.y }
    : { x: start.x, y: start.y + Math.sign(end.y - start.y || 1) * bend };
  const control2 = horizontal
    ? { x: end.x - Math.sign(end.x - start.x || 1) * bend, y: end.y }
    : { x: end.x, y: end.y - Math.sign(end.y - start.y || 1) * bend };
  return Array.from({ length: 25 }, (_, index) =>
    cubicPoint(start, control1, control2, end, index / 24),
  );
}

function smoothStepPoints(start: MotionPoint, end: MotionPoint): MotionPoint[] {
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  if (horizontal) {
    const direction = Math.sign(end.x - start.x || 1);
    const midX = start.x + (end.x - start.x) / 2;
    const offset = direction * 26;
    return [
      start,
      { x: start.x + offset, y: start.y },
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      { x: end.x - offset, y: end.y },
      end,
    ];
  }
  const direction = Math.sign(end.y - start.y || 1);
  const midY = start.y + (end.y - start.y) / 2;
  const offset = direction * 26;
  return [
    start,
    { x: start.x, y: start.y + offset },
    { x: start.x, y: midY },
    { x: end.x, y: midY },
    { x: end.x, y: end.y - offset },
    end,
  ];
}

export function edgePoints(diagram: DiagramDocument, edge: VibeEdge): MotionPoint[] {
  const source = diagram.nodes.find((node) => node.id === edge.source);
  const target = diagram.nodes.find((node) => node.id === edge.target);
  if (!source || !target) return [];

  const sourceBounds = nodeBounds(source);
  const targetBounds = nodeBounds(target);
  const horizontal = Math.abs(target.position.x - source.position.x) >= Math.abs(target.position.y - source.position.y);
  const start = horizontal
    ? { x: sourceBounds.x + sourceBounds.width, y: sourceCenterY(source) }
    : { x: sourceCenterX(source), y: sourceBounds.y + sourceBounds.height };
  const end = horizontal
    ? { x: targetBounds.x, y: sourceCenterY(target) }
    : { x: sourceCenterX(target), y: targetBounds.y };

  if (edge.type === "straight") return [start, end];
  if (edge.type === "bezier") return bezierPoints(start, end);
  return smoothStepPoints(start, end);
}

function sourceCenterX(node: VibeNode) {
  return node.position.x + NODE_WIDTH / 2;
}

function sourceCenterY(node: VibeNode) {
  return node.position.y + nodeHeight(node) / 2;
}

export function pointsToPath(points: MotionPoint[]): string {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
}

export function pathLength(points: MotionPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }
  return length;
}

export function pointAlongPath(points: MotionPoint[], progress: number): MotionPoint {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const target = pathLength(points) * Math.max(0, Math.min(1, progress));
  let traversed = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segment = Math.hypot(end.x - start.x, end.y - start.y);
    if (traversed + segment >= target) {
      const ratio = segment === 0 ? 0 : (target - traversed) / segment;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    traversed += segment;
  }
  return points.at(-1) ?? { x: 0, y: 0 };
}

export function graphBounds(diagram: DiagramDocument) {
  const boxes = diagram.nodes.map(nodeBounds);
  if (!boxes.length) return { x: 0, y: 0, width: 900, height: 600 };
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

export function motionSteps(diagram: DiagramDocument): MotionStep[] {
  const motion = getMotion(diagram);
  const animatedEdges = diagram.edges.filter((edge) => edge.animated);
  if (!motion.enabled && animatedEdges.length === 0) return [];
  const existing = motion.steps.filter(
    (step) =>
      step.edgeIds.every((edgeId) => diagram.edges.some((edge) => edge.id === edgeId)) &&
      step.nodeIds.every((nodeId) => diagram.nodes.some((node) => node.id === nodeId)),
  );
  if (existing.length) return existing;

  const candidates = animatedEdges.length
    ? animatedEdges
    : motion.enabled
      ? diagram.edges
      : [];
  const duration = Math.max(320, Math.round(motion.durationMs / Math.max(candidates.length, 1)));
  return candidates.map((edge, index) => ({
    id: `trace-${edge.id}-${index}`,
    nodeIds: [edge.source, edge.target],
    edgeIds: [edge.id],
    durationMs: duration,
    caption: edge.label ?? "",
  }));
}

export function motionTimeline(diagram: DiagramDocument): MotionTimelineEntry[] {
  let cursor = 0;
  return motionSteps(diagram).map((step) => {
    const startMs = cursor;
    const endMs = cursor + step.durationMs;
    cursor = endMs;
    return { ...step, startMs, endMs };
  });
}

export function motionTotalDuration(diagram: DiagramDocument): number {
  const timeline = motionTimeline(diagram);
  return timeline.length ? timeline.at(-1)!.endMs : getMotion(diagram).durationMs;
}

export function motionFrameAt(diagram: DiagramDocument, progress: number): MotionFrame {
  const timeline = motionTimeline(diagram);
  const totalMs = Math.max(1, motionTotalDuration(diagram));
  const elapsedMs = Math.max(0, Math.min(1, progress)) * totalMs;
  const entry =
    timeline.find((candidate) => elapsedMs <= candidate.endMs) ?? timeline.at(-1) ?? null;
  if (!entry) return { entry: null, progress: 0, elapsedMs, totalMs };
  return {
    entry,
    progress: Math.max(0, Math.min(1, (elapsedMs - entry.startMs) / Math.max(1, entry.endMs - entry.startMs))),
    elapsedMs,
    totalMs,
  };
}
