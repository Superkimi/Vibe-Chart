# Vibe Chart architecture

## Canonical document

The canonical `DiagramDocument` envelope contains metadata and a typed payload.
Architecture, flowchart, ER, sequence, and mind-map modes use positioned nodes
and stable ID-addressed edges. The standalone whiteboard uses independently
positioned text, sticky, shape, and line elements instead of pretending every
workshop mark is a graph node. Every writer validates against the Zod schema
before replacing the active document.

The design has three practical benefits:

1. AI edits preserve stable node IDs and can be undone as one document change.
2. Renderer adapters never need to parse another renderer's private model.
3. Tests can verify topology and output without comparing screenshots.

## Rendering surfaces

| Surface | Responsibility |
| --- | --- |
| React Flow | Direct graph manipulation, selection, handles, zoom, pan, and mini map |
| Whiteboard surface | Pointer-based free positioning for open-ended workshop elements |
| Mermaid | Portable code preview and interchange for graphs and mind maps |
| draw.io adapter | Editable `mxGraphModel` XML export for every workspace mode |
| html-to-image | PNG and SVG capture of the current canvas |
| Dagre | Deterministic automatic layout |

## AI edit pipeline

The AI route accepts a prompt, a bounded message history, model connection
settings, and the current validated document.

The system instruction is split into small diagram-kind skills. It requests one
JSON object with a short summary and either a complete updated document or a
bounded list of ID-addressed operations. The server then:

1. Parses the request with Zod.
2. Rejects unsafe model endpoints.
3. Calls an OpenAI-compatible `/chat/completions` endpoint.
4. Extracts the JSON response.
5. Applies targeted operations against the current graph when the model chose
   an incremental edit.
6. Validates IDs, node data, edge references, whiteboard elements, and document limits.
7. Preserves the current document ID.
8. Returns the validated edit to the browser.
9. Records the previous workspace snapshot before applying it.

After Dagre lays out the result, a deterministic quality pass flags node
overlaps, duplicate routes, and edges crossing unrelated nodes. These are
review hints rather than another model call, so they remain fast and
predictable.

The API key is never written to the application database or returned from the
server. Browser-provided keys live in `sessionStorage`.

## Mermaid round trip

Supported graph modes export to Mermaid:

- Architecture and process diagrams export as flowcharts.
- ER diagrams export as `erDiagram`.
- Sequence diagrams export as `sequenceDiagram`.
- Mind maps export as nested `mindmap` branches.

The visual round trip imports the generated flowchart, ER, sequence, and mind
map subsets. ER entities, sequence participants, and mind-map branches use
stable identifiers plus display labels, so a label edit does not discard node
identity or position. Grammar features without a canonical graph equivalent—
such as sequence loops, notes, arbitrary subgraphs, or free-form whiteboard
strokes—remain previewable or are represented by the whiteboard element model
instead of being silently coerced into a graph.

## Workspace modes and templates

The type picker changes the current workspace between the six supported modes.
The document rail exposes a template catalog for common architecture, incident,
ER, sequence, product strategy, roadmap, brainstorm, and blank-board starts.
Switching from a graph to a whiteboard intentionally creates an empty board;
switching between graph kinds preserves nodes and edges and adds mind-map
metadata when needed.

## Local persistence

The Zustand workspace stores diagram documents and the active document ID in
browser local storage. Undo and redo stacks remain in memory and are capped at
50 snapshots. React Flow measurement changes stay outside history, while a
whiteboard drag is grouped into one undo checkpoint. Model credentials are
excluded from the persisted workspace, and persisted v1 documents migrate into
the versioned envelope without discarding valid work.

## Security boundaries

- Mermaid renders with `securityLevel: "strict"`.
- Public model endpoints require HTTPS.
- Production rejects localhost and private network ranges.
- Model response text is parsed and validated before use.
- The proxy caps prompts, history, nodes, and edges.
- The application does not log prompts, documents, or keys.
