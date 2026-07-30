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

The system instruction requests one JSON object with a short summary and a
complete updated document. The server then:

1. Parses the request with Zod.
2. Rejects unsafe model endpoints.
3. Calls an OpenAI-compatible `/chat/completions` endpoint.
4. Extracts the JSON response.
5. Validates IDs, node data, edge references, and document limits.
6. Preserves the current document ID.
7. Returns the validated edit to the browser.
8. Records the previous workspace snapshot before applying it.

The API key is never written to the application database or returned from the
server. Browser-provided keys live in `sessionStorage`.

## Mermaid round trip

All supported diagrams export to Mermaid:

- Architecture and process diagrams export as flowcharts.
- ER diagrams export as `erDiagram`.
- Sequence diagrams export as `sequenceDiagram`.

The visual round trip currently imports the common flowchart subset. This is a
deliberate boundary. Mermaid has many grammar-specific constructs that do not
map losslessly to direct-manipulation nodes. ER and sequence source stay
exportable and previewable until grammar-specific import adapters are added.

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

