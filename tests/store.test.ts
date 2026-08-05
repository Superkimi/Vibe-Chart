import { beforeEach, describe, expect, it } from "vitest";
import { starterDocuments } from "@/lib/templates";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";

describe("workspace transactions", () => {
  beforeEach(() => {
    localStorage.clear();
    useVibeChartStore.setState({
      documents: structuredClone(starterDocuments),
      activeId: starterDocuments[0].id,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedWhiteboardElementId: null,
      past: [],
      future: [],
      hydrated: true,
    });
  });

  it("applies a complete AI result as one undoable revision", () => {
    const before = selectActiveDocument(useVibeChartStore.getState());
    const updated = structuredClone(before);
    updated.nodes[0].data.label = "AI client";

    const outcome = useVibeChartStore
      .getState()
      .replaceDocumentIfUnchanged(before.id, before.revision, updated);

    expect(outcome).toBe("applied");
    expect(useVibeChartStore.getState().past).toHaveLength(1);
    expect(selectActiveDocument(useVibeChartStore.getState()).revision).toBe(
      before.revision + 1,
    );
    useVibeChartStore.getState().undo();
    expect(selectActiveDocument(useVibeChartStore.getState()).nodes[0].data.label)
      .toBe(before.nodes[0].data.label);
  });

  it("rejects an AI result after a manual edit changes the base revision", () => {
    const before = selectActiveDocument(useVibeChartStore.getState());
    const aiResult = structuredClone(before);
    aiResult.nodes[0].data.label = "Stale AI label";

    useVibeChartStore.getState().selectNode(before.nodes[0].id);
    useVibeChartStore
      .getState()
      .updateSelectedNode({ label: "Fresh manual label" });
    const outcome = useVibeChartStore
      .getState()
      .replaceDocumentIfUnchanged(before.id, before.revision, aiResult);

    expect(outcome).toBe("stale");
    expect(selectActiveDocument(useVibeChartStore.getState()).nodes[0].data.label)
      .toBe("Fresh manual label");
  });

  it("edits and removes a selected connection through the shared history", () => {
    const before = selectActiveDocument(useVibeChartStore.getState());
    const edge = before.edges[0];
    useVibeChartStore.getState().selectEdge(edge.id);
    useVibeChartStore
      .getState()
      .updateSelectedEdge({ label: "secured", animated: true });

    const edited = selectActiveDocument(useVibeChartStore.getState()).edges[0];
    expect(edited.label).toBe("secured");
    expect(edited.animated).toBe(true);

    useVibeChartStore.getState().removeSelectedEdge();
    expect(
      selectActiveDocument(useVibeChartStore.getState()).edges.some(
        (candidate) => candidate.id === edge.id,
      ),
    ).toBe(false);
  });

  it("keeps React Flow measurement out of history and groups a drag once", () => {
    const before = selectActiveDocument(useVibeChartStore.getState());
    const node = before.nodes[0];

    useVibeChartStore.getState().onNodesChange([
      { id: node.id, type: "select", selected: true },
      {
        id: node.id,
        type: "dimensions",
        dimensions: { width: 206, height: 86 },
      },
    ]);
    expect(useVibeChartStore.getState().past).toHaveLength(0);

    useVibeChartStore.getState().beginNodeDrag();
    useVibeChartStore.getState().onNodesChange([
      {
        id: node.id,
        type: "position",
        position: { x: node.position.x + 120, y: node.position.y + 40 },
        dragging: true,
      },
    ]);
    expect(useVibeChartStore.getState().past).toHaveLength(1);
    useVibeChartStore.getState().undo();
    expect(selectActiveDocument(useVibeChartStore.getState()).nodes[0].position)
      .toEqual(node.position);
  });

  it("adds and moves a whiteboard element through the shared history", () => {
    const whiteboard = starterDocuments.find((document) => document.kind === "whiteboard")!;
    useVibeChartStore.setState({
      documents: [structuredClone(whiteboard)],
      activeId: whiteboard.id,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedWhiteboardElementId: null,
      past: [],
      future: [],
      hydrated: true,
    });
    useVibeChartStore.getState().addWhiteboardElement("sticky");
    const selected = useVibeChartStore.getState().selectedWhiteboardElementId!;
    const before = selectActiveDocument(useVibeChartStore.getState()).whiteboard!.elements.find(
      (element) => element.id === selected,
    )!;
    useVibeChartStore.getState().beginWhiteboardDrag();
    useVibeChartStore.getState().moveWhiteboardElement({ x: 320, y: 180 });
    expect(selectActiveDocument(useVibeChartStore.getState()).whiteboard!.elements.find(
      (element) => element.id === selected,
    )!.position).toEqual({ x: 320, y: 180 });
    useVibeChartStore.getState().undo();
    expect(selectActiveDocument(useVibeChartStore.getState()).whiteboard!.elements.find(
      (element) => element.id === selected,
    )!.position).toEqual(before.position);
  });
});
