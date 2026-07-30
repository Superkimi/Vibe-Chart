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
  DiagramKind,
  VibeNodeData,
} from "./diagram-schema";
import { blankDocument, starterDocuments } from "./templates";
import { layoutDiagram } from "./layout";

type Snapshot = {
  documents: DiagramDocument[];
  activeId: string;
};

type VibeChartState = Snapshot & {
  past: Snapshot[];
  future: Snapshot[];
  selectedNodeId: string | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setActive: (id: string) => void;
  addDocument: (kind?: DiagramKind) => void;
  duplicateDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (title: string) => void;
  replaceActive: (diagram: DiagramDocument) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (id: string | null) => void;
  addNode: (shape?: VibeNodeData["shape"]) => void;
  updateSelectedNode: (patch: Partial<VibeNodeData>) => void;
  removeSelectedNode: () => void;
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
        ? { ...update(document), updatedAt: new Date().toISOString() }
        : document,
    ),
    past: [...state.past, snapshot].slice(-MAX_HISTORY),
    future: [],
  };
};

export const useVibeChartStore = create<VibeChartState>()(
  persist(
    (set) => ({
      documents: starterDocuments,
      activeId: starterDocuments[0].id,
      selectedNodeId: null,
      past: [],
      future: [],
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setActive: (activeId) => set({ activeId, selectedNodeId: null }),
      addDocument: (kind = "flowchart") =>
        set((state) => {
          const document = blankDocument(kind);
          return {
            documents: [document, ...state.documents],
            activeId: document.id,
            selectedNodeId: null,
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
      onNodesChange: (changes) =>
        set((state) =>
          mutateActive(state, (document) => ({
            ...document,
            nodes: applyNodeChanges(
              changes,
              document.nodes,
            ) as DiagramDocument["nodes"],
          })),
        ),
      onEdgesChange: (changes) =>
        set((state) =>
          mutateActive(state, (document) => ({
            ...document,
            edges: applyEdgeChanges(
              changes,
              document.edges,
            ) as DiagramDocument["edges"],
          })),
        ),
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
      selectNode: (selectedNodeId) => set({ selectedNodeId }),
      addNode: (shape = "process") =>
        set((state) =>
          mutateActive(state, (document) => {
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
          }),
        ),
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
            })),
            selectedNodeId: null,
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
          };
        }),
    }),
    {
      name: "vibe-chart-workspace-v1",
      partialize: (state) => ({
        documents: state.documents,
        activeId: state.activeId,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

export const selectActiveDocument = (state: VibeChartState) =>
  state.documents.find((document) => document.id === state.activeId) ??
  state.documents[0];
