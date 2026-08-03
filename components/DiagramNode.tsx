"use client";

import {
  Database,
  Diamond,
  Globe,
  HardDrives,
  Robot,
  UserCircle,
} from "@phosphor-icons/react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { VibeNodeData } from "@/lib/diagram-schema";
import { useI18n } from "@/lib/i18n";

const iconForShape = {
  service: HardDrives,
  process: Robot,
  decision: Diamond,
  database: Database,
  external: Globe,
  actor: UserCircle,
  entity: Database,
};

export function DiagramNode({ data, selected }: NodeProps) {
  const { t } = useI18n();
  const nodeData = data as VibeNodeData;
  const Icon = iconForShape[nodeData.shape] ?? Robot;
  return (
    <article
      className={`diagram-node diagram-node--${nodeData.shape} tone-${nodeData.tone} ${selected ? "is-selected" : ""}`}
      aria-label={t("diagramNode", { label: nodeData.label })}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-target" />
      <div className="node-heading">
        <span className="node-icon" aria-hidden="true">
          <Icon size={16} weight="duotone" />
        </span>
        <div>
          <strong>{nodeData.label}</strong>
          {nodeData.subtitle ? <small>{nodeData.subtitle}</small> : null}
        </div>
      </div>
      {nodeData.shape === "entity" && nodeData.fields?.length ? (
        <ul className="entity-fields">
          {nodeData.fields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      ) : null}
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
    </article>
  );
}
