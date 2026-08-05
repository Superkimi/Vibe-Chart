"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DiagramDocument,
  DiagramMotion,
  DiagramKind,
  VibeEdge,
  VibeNodeData,
  WhiteboardElement,
} from "./diagram-schema";
import { blankDocument, starterDocuments } from "./templates";
import { layoutDiagram } from "./layout";
import { validateDiagram } from "./diagram-schema";

type Snapshot = {
  documents: DiagramDocument[];
  activeId: string;
};

type VibeChartState = Snapshot & {
  past: Snapshot[];
  future: Snapshot[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedWhiteboardElementId: string | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setActive: (id: string) => void;
  changeKind: (kind: DiagramKind) => void;
  addDocument: (kind?: DiagramKind, templateId?: string) => void;
  duplicateDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (title: string) => void;
  replaceActive: (diagram: DiagramDocument) => void;
  replaceDocumentIfUnchanged: (
    id: string,
    baseRevision: number,
    diagram: DiagramDocument,
  ) => "applied" | "stale" | "missing";
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  beginNodeDrag: () => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  selectWhiteboardElement: (id: string | null) => void;
  addNode: (shape?: VibeNodeData["shape"]) => void;
  addMindMapBranch: () => void;
  addWhiteboardElement: (type: WhiteboardElement["type"]) => void;
  updateSelectedNode: (patch: Partial<VibeNodeData>) => void;
  updateSelectedEdge: (
    patch: Partial<Pick<VibeEdge, "label" | "type" | "animated">>,
  ) => void;
  updateMotion: (patch: Partial<DiagramMotion>) => void;
  updateSelectedWhiteboardElement: (
    patch: Partial<WhiteboardElement>,
  ) => void;
  beginWhiteboardDrag: () => void;
  moveWhiteboardElement: (position: WhiteboardElement["position"]) => void;
  removeSelectedNode: () => void;
  removeSelectedEdge: () => void;
  removeSelectedWhiteboardElement: () => void;
  autoLayout: (direction?: "LR" | "TB") => void;
  undo: () => void;
  redo: () => void;
};

const MAX_HISTORY = 50;

const currentSnapshot = (state: VibeChartState): Snapshot => ({
  documents: state.documents,
  activeId: state.activeId,
});

const mutateActive = (
  state: VibeChartState,
  update: (active: DiagramDocument) => DiagramDocument,
) => {
  const snapshot = currentSnapshot(state);
  return {
    documents: state.documents.map((document) =>
      document.id === state.activeId
        ? {
            ...update(document),
            revision: (document.revision ?? 0) + 1,
            updatedAt: new Date().toISOString(),
          }
        : document,
    ),
    past: [...state.past, snapshot].slice(-MAX_HISTORY),
    future: [],
  };
};

const updateActiveWithoutHistory = (
  state: VibeChartState,
  update: (active: DiagramDocument) => DiagramDocument,
  bumpRevision = false,
) => ({
  documents: state.documents.map((document) =>
    document.id === state.activeId
      ? {
          ...update(document),
          revision: bumpRevision
            ? (document.revision ?? 0) + 1
            : document.revision,
          updatedAt: bumpRevision
            ? new Date().toISOString()
            : document.updatedAt,
        }
      : document,
  ),
});

export const useVibeChartStore = create<VibeChartState>()(
  persist(
    (set) => ({
      documents: starterDocuments,
      activeId: starterDocuments[0].id,
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedWhiteboardElementId: null,
      past: [],
      future: [],
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setActive: (activeId) =>
        set({
          activeId,
          selectedNodeId: null,
          selectedEdgeId: null,
          selectedWhiteboardElementId: null,
        }),
      changeKind: (kind) =>
        set((state) => {
          const active = selectActiveDocument(state);
          if (active.kind === kind) return state;
          if (kind === "whiteboard") {
            const blank = blankDocument("whiteboard");
            return {
              ...mutateActive(state, (document) => ({
                ...blank,
                id: document.id,
                title: document.title,
              })),
              selectedNodeId: null,
              selectedEdgeId: null,
              selectedWhiteboardElementId: null,
            };
          }
          if (active.kind === "whiteboard") {
            const blank = blankDocument(kind);
            return {
              ...mutateActive(state, (document) => ({
                ...blank,
                id: document.id,
                title: document.title,
              })),
              selectedNodeId: null,
              selectedEdgeId: null,
              selectedWhiteboardElementId: null,
            };
          }
          return {
            ...mutateActive(state, (document) => ({
              ...document,
              kind,
              mindmap:
                kind === "mindmap"
                  ? {
                      rootId: document.mindmap?.rootId ?? document.nodes[0]?.id ?? "root",
                      layout: document.mindmap?.layout ?? "right",
                    }
                  : undefined,
            })),
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedWhiteboardElementId: null,
          };
        }),
      addDocument: (kind = "flowchart", templateId) =>
        set((state) => {
          const document = blankDocument(kind, templateId);
          return {
            documents: [document, ...state.documents],
            activeId: document.id,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedWhiteboardElementId: null,
            past: [...state.past, currentSnapshot(state)].slice(-MAX_HISTORY),
            future: [],
          };
        }),
      duplicateDocument: (id) =>
        set((state) => {
          const source = state.documents.find((document) => document.id === id);
          if (!source) return state;
          const copy = {
            ...structuredClone(source),
            id: `${source.id}-copy-${Date.now()}`,
            title: `${source.title} copy`,
            updatedAt: new Date().toISOString(),
          };
          return {
            documents: [copy, ...state.documents],
            activeId: copy.id,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedWhiteboardElementId: null,
            past: [...state.past, currentSnapshot(state)].slice(-MAX_HISTORY),
            future: [],
          };
        }),
      deleteDocument: (id) =>
        set((state) => {
          if (state.documents.length === 1) return state;
          const documents = state.documents.filter(
            (document) => document.id !== id,
          );
          return {
            documents,
            activeId:
              state.activeId === id ? documents[0].id : state.activeId,
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedWhiteboardElementId: null,
            past: [...state.past, currentSnapshot(state)].slice(-MAX_HISTORY),
            future: [],
          };
        }),
      renameDocument: (title) =>
        set((state) =>
          mutateActive(state, (document) => ({ ...document, title })),
        ),
      replaceActive: (diagram) =>
        set((state) =>
          mutateActive(state, () => ({
            ...diagram,
            id: state.activeId,
          })),
        ),
      replaceDocumentIfUnchanged: (id, baseRevision, diagram) => {
        let outcome: "applied" | "stale" | "missing" = "missing";
        set((state) => {
          const current = state.documents.find((document) => document.id === id);
          if (!current) return state;
          if ((current.revision ?? 0) !== baseRevision) {
            outcome = "stale";
            return state;
          }
          outcome = "applied";
          return {
            documents: state.documents.map((document) =>
              document.id === id
                ? {
                    ...diagram,
                    id,
                    revision: (current.revision ?? 0) + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : document,
            ),
            past: [...state.past, currentSnapshot(state)].slice(-MAX_HISTORY),
            future: [],
          };
        });
        return outcome;
      },
      onNodesChange: (changes) =>
        set((state) => {
          const changesModel = changes.some(
            (change) =>
              change.type !== "select" &&
              change.type !== "dimensions" &&
              change.type !== "position",
          );
          const changesPosition = changes.some(
            (change) => change.type === "position",
          );
          const update = (document: DiagramDocument) => ({
            ...document,
            nodes: applyNodeChanges(
              changes,
              document.nodes,
            ) as DiagramDocument["nodes"],
          });
          return changesModel
            ? mutateActive(state, update)
            : updateActiveWithoutHistory(state, update, changesPosition);
        }),
      onEdgesChange: (changes) =>
        set((state) => {
          const changesModel = changes.some(
            (change) => change.type !== "select",
          );
          const update = (document: DiagramDocument) => ({
            ...document,
            edges: applyEdgeChanges(
              changes,
              document.edges,
            ) as DiagramDocument["edges"],
          });
          return changesModel
            ? mutateActive(state, update)
            : updateActiveWithoutHistory(state, update);
        }),
      onConnect: (connection) =>
        set((state) =>
          mutateActive(state, (document) => ({
            ...document,
            edges: addEdge(
              {
                ...connection,
                id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
                type: "smoothstep",
              },
              document.edges,
            ) as DiagramDocument["edges"],
          })),
        ),
      beginNodeDrag: () =>
        set((state) => ({
          past: [...state.past, currentSnapshot(state)].slice(-MAX_HISTORY),
          future: [],
        })),
      selectNode: (selectedNodeId) =>
        set({ selectedNodeId, selectedEdgeId: null, selectedWhiteboardElementId: null }),
      selectEdge: (selectedEdgeId) =>
        set({ selectedEdgeId, selectedNodeId: null, selectedWhiteboardElementId: null }),
      selectWhiteboardElement: (selectedWhiteboardElementId) =>
        set({
          selectedWhiteboardElementId,
          selectedNodeId: null,
          selectedEdgeId: null,
        }),
      addNode: (shape = "process") =>
        set((state) => {
          if (selectActiveDocument(state).kind === "whiteboard") return state;
          return mutateActive(state, (document) => {
            const id = `node_${Date.now()}`;
            return {
              ...document,
              nodes: [
                ...document.nodes,
                {
                  id,
                  type: "vibeNode",
                  position: {
                    x: 120 + (document.nodes.length % 3) * 250,
                    y: 120 + Math.floor(document.nodes.length / 3) * 160,
                  },
                  data: {
                    label:
                      shape === "decision"
                        ? "Decision"
                        : shape === "database"
                          ? "Data store"
                          : "New step",
                    subtitle: "",
                    shape,
                    tone: shape === "database" ? "cyan" : "lilac",
                    fields: shape === "entity" ? ["uuid id PK"] : [],
                  },
                },
              ],
            };
          });
        }),
      addMindMapBranch: () =>
        set((state) => {
          const active = selectActiveDocument(state);
          if (active.kind !== "mindmap") return state;
          const parentId =
            state.selectedNodeId ?? active.mindmap?.rootId ?? active.nodes[0]?.id;
          if (!parentId) return state;
          const id = `branch_${Date.now()}`;
          const next = mutateActive(state, (document) => ({
            ...document,
            nodes: [
              ...document.nodes,
              {
                id,
                type: "vibeNode" as const,
                position: { x: 360, y: 280 },
                data: {
                  label: "New branch",
                  subtitle: "Describe this idea",
                  shape: "process" as const,
                  tone: "lilac" as const,
                  fields: [],
                },
              },
            ],
            edges: [
              ...document.edges,
              {
                id: `edge-${parentId}-${id}`,
                source: parentId,
                target: id,
                label: "",
                type: "smoothstep" as const,
                animated: false,
              },
            ],
          }));
          return { ...next, selectedNodeId: id, selectedEdgeId: null };
        }),
      addWhiteboardElement: (type) =>
        set((state) => {
          const active = selectActiveDocument(state);
          if (active.kind !== "whiteboard") return state;
          const index = active.whiteboard?.elements.length ?? 0;
          const id = `element_${Date.now()}`;
          const size =
            type === "line"
              ? { width: 220, height: 4 }
              : type === "text"
                ? { width: 270, height: 76 }
                : { width: 210, height: 130 };
          const element: WhiteboardElement = {
            id,
            type,
            position: {
              x: 100 + (index % 4) * 250,
              y: 100 + Math.floor(index / 4) * 180,
            },
            size,
            text:
              type === "sticky"
                ? "New idea"
                : type === "text"
                  ? "Double-click to edit"
                  : "",
            tone: type === "sticky" ? "amber" : "lilac",
            rotation: 0,
          };
          const next = mutateActive(state, (document) => ({
            ...document,
            whiteboard: {
              elements: [...(document.whiteboard?.elements ?? []), element],
            },
          }));
          return {
            ...next,
            selectedWhiteboardElementId: id,
            selectedNodeId: null,
            selectedEdgeId: null,
          };
        }),
      updateSelectedNode: (patch) =>
        set((state) => {
          if (!state.selectedNodeId) return state;
          return mutateActive(state, (document) => ({
            ...document,
            nodes: document.nodes.map((node) =>
              node.id === state.selectedNodeId
                ? { ...node, data: { ...node.data, ...patch } }
                : node,
            ),
          }));
        }),
      updateSelectedEdge: (patch) =>
        set((state) => {
          if (!state.selectedEdgeId) return state;
          return mutateActive(state, (document) => ({
            ...document,
            edges: document.edges.map((edge) =>
              edge.id === state.selectedEdgeId ? { ...edge, ...patch } : edge,
            ),
          }));
        }),
      updateMotion: (patch) =>
        set((state) =>
          mutateActive(state, (document) => ({
            ...document,
            motion: {
              enabled: document.motion?.enabled ?? false,
              mode: document.motion?.mode ?? "trace",
              durationMs: document.motion?.durationMs ?? 4800,
              loop: document.motion?.loop ?? false,
              steps: document.motion?.steps ?? [],
              ...patch,
            },
          })),
        ),
      updateSelectedWhiteboardElement: (patch) =>
        set((state) => {
          const id = state.selectedWhiteboardElementId;
          if (!id) return state;
          return mutateActive(state, (document) => ({
            ...document,
            whiteboard: {
              elements: (document.whiteboard?.elements ?? []).map((element) =>
                element.id === id ? { ...element, ...patch } : element,
              ),
            },
          }));
        }),
      beginWhiteboardDrag: () =>
        set((state) => ({
          past: [...state.past, currentSnapshot(state)].slice(-MAX_HISTORY),
          future: [],
        })),
      moveWhiteboardElement: (position) =>
        set((state) => {
          const id = state.selectedWhiteboardElementId;
          if (!id) return state;
          return updateActiveWithoutHistory(state, (document) => ({
            ...document,
            whiteboard: {
              elements: (document.whiteboard?.elements ?? []).map((element) =>
                element.id === id ? { ...element, position } : element,
              ),
            },
          }), true);
        }),
      removeSelectedNode: () =>
        set((state) => {
          if (!state.selectedNodeId) return state;
          const id = state.selectedNodeId;
          return {
            ...mutateActive(state, (document) => ({
              ...document,
              nodes: document.nodes.filter((node) => node.id !== id),
              edges: document.edges.filter(
                (edge) => edge.source !== id && edge.target !== id,
              ),
              mindmap:
                document.kind === "mindmap" && document.mindmap?.rootId === id
                  ? {
                      ...document.mindmap,
                      rootId:
                        document.nodes.find((node) => node.id !== id)?.id ??
                        document.mindmap.rootId,
                    }
                  : document.mindmap,
            })),
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedWhiteboardElementId: null,
          };
        }),
      removeSelectedEdge: () =>
        set((state) => {
          if (!state.selectedEdgeId) return state;
          const id = state.selectedEdgeId;
          return {
            ...mutateActive(state, (document) => ({
              ...document,
              edges: document.edges.filter((edge) => edge.id !== id),
            })),
            selectedEdgeId: null,
          };
        }),
      removeSelectedWhiteboardElement: () =>
        set((state) => {
          const id = state.selectedWhiteboardElementId;
          if (!id) return state;
          return {
            ...mutateActive(state, (document) => ({
              ...document,
              whiteboard: {
                elements: (document.whiteboard?.elements ?? []).filter(
                  (element) => element.id !== id,
                ),
              },
            })),
            selectedWhiteboardElementId: null,
          };
        }),
      autoLayout: (direction) =>
        set((state) =>
          mutateActive(state, (document) =>
            layoutDiagram(document, direction ?? document.direction),
          ),
        ),
      undo: () =>
        set((state) => {
          const previous = state.past.at(-1);
          if (!previous) return state;
          return {
            ...previous,
            past: state.past.slice(0, -1),
            future: [currentSnapshot(state), ...state.future].slice(
              0,
              MAX_HISTORY,
            ),
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedWhiteboardElementId: null,
          };
        }),
      redo: () =>
        set((state) => {
          const next = state.future[0];
          if (!next) return state;
          return {
            ...next,
            past: [...state.past, currentSnapshot(state)].slice(-MAX_HISTORY),
            future: state.future.slice(1),
            selectedNodeId: null,
            selectedEdgeId: null,
            selectedWhiteboardElementId: null,
          };
        }),
    }),
    {
      name: "vibe-chart-workspace-v2",
      version: 2,
      partialize: (state) => ({
        documents: state.documents,
        activeId: state.activeId,
      }),
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const value = persisted as {
          documents?: unknown;
          activeId?: unknown;
        };
        const documents = Array.isArray(value.documents)
          ? value.documents.flatMap((document) => {
              try {
                return [
                  validateDiagram({
                    ...(document as Record<string, unknown>),
                    schemaVersion: 2,
                  }),
                ];
              } catch {
                return [];
              }
            })
          : [];
        return {
          documents: documents.length ? documents : starterDocuments,
          activeId:
            typeof value.activeId === "string" &&
            documents.some((document) => document.id === value.activeId)
              ? value.activeId
              : documents[0]?.id ?? starterDocuments[0].id,
        };
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

export const selectActiveDocument = (state: VibeChartState) =>
  state.documents.find((document) => document.id === state.activeId) ??
  state.documents[0];
