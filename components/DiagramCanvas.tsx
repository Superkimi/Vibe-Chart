"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DiagramNode } from "./DiagramNode";
import { MotionControls, useMotionPlayback } from "./MotionControls";
import { MotionPreviewLayer } from "./MotionPreviewLayer";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";

export function DiagramCanvas() {
  const diagram = useVibeChartStore(selectActiveDocument);
  return diagram.kind === "whiteboard" ? (
    <WhiteboardCanvas />
  ) : (
    <SemanticDiagramCanvas diagram={diagram} />
  );
}

function SemanticDiagramCanvas({ diagram }: { diagram: ReturnType<typeof selectActiveDocument> }) {
  const onNodesChange = useVibeChartStore((state) => state.onNodesChange);
  const onEdgesChange = useVibeChartStore((state) => state.onEdgesChange);
  const onConnect = useVibeChartStore((state) => state.onConnect);
  const beginNodeDrag = useVibeChartStore((state) => state.beginNodeDrag);
  const selectNode = useVibeChartStore((state) => state.selectNode);
  const selectEdge = useVibeChartStore((state) => state.selectEdge);
  const { progress, setProgress, playing, setPlaying } = useMotionPlayback(diagram);
  const nodeTypes = useMemo<NodeTypes>(
    () => ({ vibeNode: DiagramNode }),
    [],
  );
  const displayEdges = useMemo(
    () =>
      diagram.edges.map((edge) => ({
        ...edge,
        style: { stroke: "var(--text-soft)", strokeWidth: 1.5 },
        labelStyle: {
          fill: "var(--text-soft)",
          fontFamily: "Geist Mono Variable",
          fontSize: 10,
        },
        labelBgStyle: {
          fill: "var(--canvas)",
          fillOpacity: 0.94,
        },
      })),
    [diagram.edges],
  );

  return (
    <div
      className={`canvas-surface ${diagram.kind === "mindmap" ? "mindmap-canvas" : ""}`}
      id="diagram-export-surface"
    >
      <MotionControls
        diagram={diagram}
        progress={progress}
        onProgress={setProgress}
        playing={playing}
        onPlayingChange={setPlaying}
      />
      <ReactFlow
        nodes={diagram.nodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={beginNodeDrag}
        onNodeClick={(_, node) => selectNode(node.id)}
        onEdgeClick={(_, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1.15 }}
        minZoom={0.18}
        maxZoom={2}
        snapToGrid
        snapGrid={[12, 12]}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="var(--canvas-dot)"
          gap={20}
          size={1}
        />
        <MiniMap
          pannable
          zoomable
          bgColor="var(--panel-strong)"
          nodeColor="var(--accent-muted)"
          maskColor="var(--minimap-mask)"
        />
        <Controls showInteractive={false} />
        <MotionPreviewLayer diagram={diagram} progress={progress} />
      </ReactFlow>
    </div>
  );
}
