import { GIFEncoder, applyPalette, quantize } from "gifenc";
import type { DiagramDocument, VibeEdge, VibeNode } from "./diagram-schema";
import {
  edgePoints,
  getMotion,
  graphBounds,
  motionFrameAt,
  motionSteps,
  motionTotalDuration,
  nodeBounds,
  pointAlongPath,
} from "./motion";

export type MotionExportFormat = "webm" | "gif";

export type MotionExportOptions = {
  width?: number;
  height?: number;
  backgroundColor?: string;
  foregroundColor?: string;
  accentColor?: string;
};

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_BACKGROUND = "#fbfaff";
const DEFAULT_FOREGROUND = "#716a7b";
const DEFAULT_ACCENT = "#6650a4";

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawEdge(
  context: CanvasRenderingContext2D,
  diagram: DiagramDocument,
  edge: VibeEdge,
  scale: number,
  active: boolean,
  foregroundColor: string,
  accentColor: string,
) {
  const points = edgePoints(diagram, edge);
  if (points.length < 2) return;
  context.save();
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.strokeStyle = active ? accentColor : foregroundColor;
  context.globalAlpha = active ? 0.95 : 0.32;
  context.lineWidth = (active ? 3 : 1.5) / Math.max(scale, 0.1);
  context.setLineDash(active ? [] : [5 / Math.max(scale, 0.1), 8 / Math.max(scale, 0.1)]);
  context.stroke();
  context.restore();

  if (edge.label) {
    const midpoint = pointAlongPath(points, 0.5);
    context.save();
    context.font = `${10 / Math.max(scale, 0.1)}px "Geist Mono Variable", monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const paddingX = 5 / Math.max(scale, 0.1);
    const textWidth = context.measureText(edge.label).width;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = 18 / Math.max(scale, 0.1);
    context.fillStyle = DEFAULT_BACKGROUND;
    context.globalAlpha = 0.94;
    roundedRect(
      context,
      midpoint.x - boxWidth / 2,
      midpoint.y - boxHeight / 2,
      boxWidth,
      boxHeight,
      4 / Math.max(scale, 0.1),
    );
    context.fill();
    context.fillStyle = foregroundColor;
    context.globalAlpha = 0.9;
    context.fillText(edge.label, midpoint.x, midpoint.y + 0.5 / Math.max(scale, 0.1));
    context.restore();
  }
}

function drawNode(
  context: CanvasRenderingContext2D,
  node: VibeNode,
  scale: number,
  foregroundColor: string,
  accentColor: string,
  active: boolean,
) {
  const bounds = nodeBounds(node);
  context.save();
  context.fillStyle = active ? "#eee9f8" : "#ffffff";
  context.strokeStyle = active ? accentColor : "#e2dee7";
  context.lineWidth = (active ? 2 : 1) / Math.max(scale, 0.1);
  roundedRect(context, bounds.x, bounds.y, bounds.width, bounds.height, 10 / Math.max(scale, 0.1));
  context.fill();
  context.stroke();

  context.fillStyle = active ? accentColor : foregroundColor;
  context.globalAlpha = 0.9;
  context.beginPath();
  context.arc(bounds.x + 17, bounds.y + 20, 5 / Math.max(scale, 0.1), 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = "#292530";
  context.font = `640 ${13 / Math.max(scale, 0.1)}px "Geist Variable", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(node.data.label, bounds.x + 31, bounds.y + 20);
  if (node.data.subtitle) {
    context.fillStyle = foregroundColor;
    context.globalAlpha = 0.8;
    context.font = `${10 / Math.max(scale, 0.1)}px "Geist Variable", sans-serif`;
    context.fillText(node.data.subtitle, bounds.x + 15, bounds.y + 43);
  }
  if (node.data.shape === "entity" && node.data.fields?.length) {
    context.fillStyle = foregroundColor;
    context.globalAlpha = 0.76;
    context.font = `${9 / Math.max(scale, 0.1)}px "Geist Mono Variable", monospace`;
    node.data.fields.slice(0, 4).forEach((field, index) => {
      context.fillText(field, bounds.x + 15, bounds.y + 67 + index * 14);
    });
  }
  context.restore();
}

function drawFrame(
  context: CanvasRenderingContext2D,
  diagram: DiagramDocument,
  progress: number,
  options: Required<Pick<MotionExportOptions, "width" | "height" | "backgroundColor" | "foregroundColor" | "accentColor">>,
) {
  const { width, height, backgroundColor, foregroundColor, accentColor } = options;
  context.clearRect(0, 0, width, height);
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);

  const bounds = graphBounds(diagram);
  const padding = 60;
  const scale = Math.min(
    (width - padding * 2) / Math.max(bounds.width, 1),
    (height - padding * 2) / Math.max(bounds.height, 1),
  );
  const offsetX = (width - bounds.width * scale) / 2 - bounds.x * scale;
  const offsetY = (height - bounds.height * scale) / 2 - bounds.y * scale;
  const frame = motionFrameAt(diagram, progress);
  const activeEdgeIds = new Set(frame.entry?.edgeIds ?? []);
  const activeNodeIds = new Set(frame.entry?.nodeIds ?? []);

  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);
  diagram.edges.forEach((edge) =>
    drawEdge(
      context,
      diagram,
      edge,
      scale,
      activeEdgeIds.has(edge.id),
      foregroundColor,
      accentColor,
    ),
  );
  diagram.nodes.forEach((node) =>
    drawNode(
      context,
      node,
      scale,
      foregroundColor,
      accentColor,
      activeNodeIds.has(node.id),
    ),
  );

  if (frame.entry?.edgeIds.length) {
    const edge = diagram.edges.find((candidate) => candidate.id === frame.entry?.edgeIds[0]);
    const points = edge ? edgePoints(diagram, edge) : [];
    if (points.length > 1) {
      const head = pointAlongPath(points, frame.progress);
      const trail = pointAlongPath(points, Math.max(0, frame.progress - 0.24));
      context.save();
      context.beginPath();
      context.moveTo(trail.x, trail.y);
      context.lineTo(head.x, head.y);
      context.strokeStyle = accentColor;
      context.globalAlpha = 0.72;
      context.lineWidth = 7 / Math.max(scale, 0.1);
      context.lineCap = "round";
      context.stroke();
      context.fillStyle = accentColor;
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(head.x, head.y, 6 / Math.max(scale, 0.1), 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }
  context.restore();
}

function exportOptions(options: MotionExportOptions) {
  return {
    width: Math.max(320, Math.round(options.width ?? DEFAULT_WIDTH)),
    height: Math.max(240, Math.round(options.height ?? DEFAULT_HEIGHT)),
    backgroundColor: options.backgroundColor ?? DEFAULT_BACKGROUND,
    foregroundColor: options.foregroundColor ?? DEFAULT_FOREGROUND,
    accentColor: options.accentColor ?? DEFAULT_ACCENT,
  };
}

async function exportWebm(
  diagram: DiagramDocument,
  options: ReturnType<typeof exportOptions>,
): Promise<Blob> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Motion export is unavailable in this browser.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const context = canvas.getContext("2d");
  if (!context || typeof canvas.captureStream !== "function") {
    throw new Error("Motion export is unavailable in this browser.");
  }
  const stream = canvas.captureStream(24);
  const mimeType = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (!mimeType) throw new Error("Motion export is unavailable in this browser.");

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  const duration = Math.max(1200, Math.min(15000, motionTotalDuration(diagram)));
  return new Promise((resolve, reject) => {
    let frameRequest = 0;
    const startedAt = performance.now();
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Motion export failed."));
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
    const draw = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      drawFrame(context, diagram, progress, options);
      if (progress >= 1) {
        recorder.stop();
        return;
      }
      frameRequest = requestAnimationFrame(draw);
    };
    recorder.start();
    frameRequest = requestAnimationFrame(draw);
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
      if (frameRequest) cancelAnimationFrame(frameRequest);
    }, duration + 250);
  });
}

async function exportGif(
  diagram: DiagramDocument,
  options: ReturnType<typeof exportOptions>,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Motion export is unavailable in this browser.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(options.width, 960);
  canvas.height = Math.min(options.height, 540);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Motion export is unavailable in this browser.");
  const encoder = GIFEncoder();
  const fps = 12;
  const duration = Math.max(1800, Math.min(8000, motionTotalDuration(diagram)));
  const frameCount = Math.max(2, Math.ceil((duration / 1000) * fps));
  for (let index = 0; index < frameCount; index += 1) {
    drawFrame(context, diagram, index / (frameCount - 1), {
      ...options,
      width: canvas.width,
      height: canvas.height,
    });
    const rgba = new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data);
    const palette = quantize(rgba, 128);
    const indexed = applyPalette(rgba, palette);
    encoder.writeFrame(indexed, canvas.width, canvas.height, {
      palette,
      delay: 1000 / fps,
      repeat: 0,
    });
    if (index % 2 === 1) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  encoder.finish();
  const bytes = encoder.bytes();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "image/gif" });
}

export async function exportMotion(
  diagram: DiagramDocument,
  format: MotionExportFormat,
  options: MotionExportOptions = {},
): Promise<Blob> {
  const normalized = exportOptions(options);
  if (!getMotion(diagram).enabled && !diagram.edges.some((edge) => edge.animated)) {
    throw new Error("Motion export is unavailable until motion is enabled.");
  }
  if (!motionSteps(diagram).length) {
    throw new Error("Motion export is unavailable until the diagram has a motion step.");
  }
  return format === "gif"
    ? exportGif(diagram, normalized)
    : exportWebm(diagram, normalized);
}

export { drawFrame };
