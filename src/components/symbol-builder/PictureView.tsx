import { forwardRef } from "react";

import { CANVAS_SIZE, SYMBOL_LABELS, type Piece } from "@/lib/symbols";

import { CanvasBackdrop, ShapeGraphic, pieceTransform } from "./ShapeGraphic";

/** Read-only rendering of a finished picture (also used to export a PNG). */
export const PictureView = forwardRef<SVGSVGElement, { pieces: Piece[]; className?: string }>(
  function PictureView({ pieces, className }, ref) {
    const summary = pieces.map((p) => SYMBOL_LABELS[p.kind]).join(", ");
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        className={className}
        role="img"
        aria-label={`Your picture made from: ${summary}`}
      >
        <CanvasBackdrop patternId="spb-dots-view" />
        {pieces.map((p) => (
          <g key={p.id} transform={pieceTransform(p)}>
            <ShapeGraphic kind={p.kind} />
          </g>
        ))}
      </svg>
    );
  },
);