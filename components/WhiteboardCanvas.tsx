"use client";

import { useRef, useState } from "react";
import {
  Circle,
  Minus,
  Note,
  Square,
  TextT,
  Trash,
} from "@phosphor-icons/react";
import type { WhiteboardElement } from "@/lib/diagram-schema";
import { useI18n } from "@/lib/i18n";
import { selectActiveDocument, useVibeChartStore } from "@/lib/store";

const elementTypes: Array<{
  type: WhiteboardElement["type"];
  label: "newWhiteboardText" | "newWhiteboardSticky" | "newWhiteboardRectangle" | "newWhiteboardEllipse" | "newWhiteboardLine";
  icon: typeof TextT;
}> = [
  { type: "text", label: "newWhiteboardText", icon: TextT },
  { type: "sticky", label: "newWhiteboardSticky", icon: Note },
  { type: "rectangle", label: "newWhiteboardRectangle", icon: Square },
  { type: "ellipse", label: "newWhiteboardEllipse", icon: Circle },
  { type: "line", label: "newWhiteboardLine", icon: Minus },
];

export function WhiteboardCanvas() {
  const { t } = useI18n();
  const diagram = useVibeChartStore(selectActiveDocument);
  const elements = diagram.whiteboard?.elements ?? [];
  const selectedId = useVibeChartStore(
    (state) => state.selectedWhiteboardElementId,
  );
  const selectElement = useVibeChartStore(
    (state) => state.selectWhiteboardElement,
  );
  const addElement = useVibeChartStore((state) => state.addWhiteboardElement);
  const beginDrag = useVibeChartStore((state) => state.beginWhiteboardDrag);
  const moveElement = useVibeChartStore(
    (state) => state.moveWhiteboardElement,
  );
  const removeElement = useVibeChartStore(
    (state) => state.removeSelectedWhiteboardElement,
  );
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    pointerId: number;
    originX: number;
    originY: number;
    elementX: number;
    elementY: number;
  } | null>(null);

  const positionFromPointer = (event: React.PointerEvent) => {
    const surface = surfaceRef.current;
    if (!surface) return { x: event.clientX, y: event.clientY };
    const bounds = surface.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left + surface.scrollLeft,
      y: event.clientY - bounds.top + surface.scrollTop,
    };
  };

  return (
    <div className="whiteboard-canvas-surface" id="diagram-export-surface">
      <div className="whiteboard-toolbar" aria-label={t("whiteboardTools")}>
        <span className="whiteboard-toolbar-title">{t("whiteboard")}</span>
        {elementTypes.map(({ type, label, icon: Icon }) => (
          <button
            type="button"
            key={type}
            onClick={() => addElement(type)}
            title={t(label)}
            aria-label={t(label)}
          >
            <Icon size={15} />
          </button>
        ))}
        <span className="whiteboard-toolbar-hint">{t("whiteboardHint")}</span>
        {selectedId ? (
          <button
            type="button"
            className="whiteboard-delete-button"
            onClick={removeElement}
            title={t("deleteSelectedElement")}
            aria-label={t("deleteSelectedElement")}
          >
            <Trash size={15} />
          </button>
        ) : null}
      </div>
      <div
        className="whiteboard-viewport"
        ref={surfaceRef}
        onPointerDown={() => selectElement(null)}
      >
        <div className="whiteboard-surface" style={{ minWidth: "1400px", minHeight: "1000px" }}>
          {elements.map((element) => {
            const selected = element.id === selectedId;
            return (
              <div
                key={element.id}
                className={`whiteboard-element whiteboard-element--${element.type} tone-${element.tone} ${selected ? "is-selected" : ""}`}
                style={{
                  left: element.position.x,
                  top: element.position.y,
                  width: element.size.width,
                  height: element.size.height,
                  transform: `rotate(${element.rotation}deg)`,
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  if (event.button !== 0) return;
                  selectElement(element.id);
                  beginDrag();
                  const point = positionFromPointer(event);
                  setDrag({
                    pointerId: event.pointerId,
                    originX: point.x,
                    originY: point.y,
                    elementX: element.position.x,
                    elementY: element.position.y,
                  });
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (!drag || drag.pointerId !== event.pointerId) return;
                  const point = positionFromPointer(event);
                  moveElement({
                    x: Math.max(12, drag.elementX + point.x - drag.originX),
                    y: Math.max(12, drag.elementY + point.y - drag.originY),
                  });
                }}
                onPointerUp={(event) => {
                  if (drag?.pointerId !== event.pointerId) return;
                  setDrag(null);
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={() => setDrag(null)}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  selectElement(element.id);
                }}
              >
                {element.type !== "line" ? element.text : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
