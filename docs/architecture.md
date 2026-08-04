# Vibe Chart architecture

## Canonical document

The canonical `DiagramDocument` contains metadata, typed nodes, positioned
coordinates, and typed edges. Every writer validates against the Zod schema
before replacing the active document.

The design has three practical benefits:

1. AI edits preserve stable node IDs and can be undone as one document change.
2. Renderer adapters never need to parse another renderer's private model.
3. Tests can verify topology and output without comparing screenshots.

## Rendering surfaces

| Surface | Responsibility |
| --- | --- |
| React Flow | Direct manipulation, selection, handles, zoom, pan, and mini map |
| Mermaid | Portable code preview and interchange |
| draw.io adapter | Editable `mxGraphModel` XML export |
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
6. Validates IDs, node data, edge references, and document limits.
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

All supported diagrams export to Mermaid:

- Architecture and process diagrams export as flowcharts.
- ER diagrams export as `erDiagram`.
- Sequence diagrams export as `sequenceDiagram`.

The visual round trip imports the generated flowchart, ER, and sequence
subsets. ER entities and sequence participants use stable identifiers plus
Mermaid display aliases, so a label edit does not discard node identity or
position. Grammar features without a canonical graph equivalent—such as
sequence loops, notes, and arbitrary subgraphs—remain previewable but are not
applied to the canvas.

## Local persistence

The Zustand workspace stores diagram documents and the active document ID in
browser local storage. Undo and redo stacks remain in memory and are capped at
50 snapshots. Model credentials are excluded from the persisted workspace.

## Security boundaries

- Mermaid renders with `securityLevel: "strict"`.
- Public model endpoints require HTTPS.
- Production rejects localhost and private network ranges.
- Model response text is parsed and validated before use.
- The proxy caps prompts, history, nodes, and edges.
- The application does not log prompts, documents, or keys.
