# Optional Kroki gateway

This is the small, native-engine Kroki deployment used by Vibe Chart's
server-side renderer proxy. It intentionally does not start browser-based
companions. Local Mermaid remains the interactive/default preview; this
gateway adds PlantUML, Graphviz, D2, and DBML output for advanced preview and
SVG/PNG/PDF export.

The gateway is bound to loopback and should not be exposed publicly. Start it
with a Docker-compatible Podman or Docker Compose implementation:

```bash
docker compose -f ops/kroki/compose.yml up -d
```

Then configure the Vibe Chart process with:

```bash
VIBE_CHART_KROKI_BASE_URL=http://127.0.0.1:30248
VIBE_CHART_KROKI_ENGINES=plantuml,graphviz,d2,dbml
VIBE_CHART_KROKI_VERSION=0.32.0
VIBE_CHART_KROKI_TIMEOUT_MS=12000
```

The Vibe Chart route applies an additional source-size limit, renderer-specific
format/option allowlist, timeout, private cache policy, and ETag. Do not set
the base URL to a public Kroki instance for private diagrams.
