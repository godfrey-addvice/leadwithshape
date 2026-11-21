import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  CANVAS_SIZE,
  SYMBOL_LABELS,
  clampPosition,
  clampSize,
  normalizeRotation,
  removePiece,
  snapRotation,
  updatePiece,
  type Piece,
} from "@/lib/symbols";

import { CanvasBackdrop, ShapeGraphic, pieceTransform } from "./ShapeGraphic";

type Pt = { x: number; y: number };
type Updater = (pieces: Piece[]) => Piece[];

type Gesture =
  | {
      mode: "drag";
      id: string;
      pointerId: number;
      start: Pt;
      startClient: Pt;
      origin: Pt;
      active: boolean;
    }
  | { mode: "rotate"; id: string; center: Pt; startAngle: number; startRotation: number }
  | { mode: "resize"; id: string; center: Pt; startDist: number; startSize: number }
  | {
      mode: "pinch";
      id: string;
      ids: [number, number];
      startDist: number;
      startAngle: number;
      startMid: Pt;
      startSize: number;
      startRotation: number;
      origin: Pt;
    }
  | { mode: "background"; startClient: Pt; moved: boolean };

/** Finger travel (screen px) before a press on a shape becomes a drag — keeps taps as taps. */
const DRAG_THRESHOLD_PX = 3;

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const angleDeg = (a: Pt, b: Pt) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export interface PictureCanvasProps {
  pieces: Piece[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBeginGesture: () => void;
  onLiveUpdate: (updater: Updater) => void;
  onEndGesture: () => void;
  onCommit: (updater: Updater) => void;
  describedBy?: string;
}

/**
 * Interactive drawing surface.
 * Every pointer is captured on the <svg> root (which never re-mounts), so a drag
 * keeps tracking even when the finger slides off the shape. `touch-action: none`
 * plus a non-passive touchmove listener stop iOS Safari/Brave from scrolling or
 * zooming the page mid-gesture.
 */
export function PictureCanvas({
  pieces,
  selectedId,
  onSelect,
  onBeginGesture,
  onLiveUpdate,
  onEndGesture,
  onCommit,
  describedBy,
}: PictureCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<Gesture | null>(null);
  const begun = useRef(false);
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  /** Screen pixels per canvas unit — keeps handles finger-sized at any screen width. */
  const [unitPx, setUnitPx] = useState(0.6);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const prevent = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    svg.addEventListener("touchmove", prevent, { passive: false });
    svg.addEventListener("gesturestart", prevent);
    svg.addEventListener("contextmenu", prevent);
    const measure = () => {
      const w = svg.getBoundingClientRect().width;
      if (w > 0) setUnitPx(w / CANVAS_SIZE);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(svg);
    window.addEventListener("resize", measure);
    return () => {
      svg.removeEventListener("touchmove", prevent);
      svg.removeEventListener("gesturestart", prevent);
      svg.removeEventListener("contextmenu", prevent);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const toSvg = useCallback((clientX: number, clientY: number): Pt | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const capture = (pointerId: number) => {
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // Pointer already released; nothing to capture.
    }
  };

  const ensureBegun = () => {
    if (!begun.current) {
      begun.current = true;
      onBeginGesture();
    }
  };

  const startPinch = (id: string) => {
    const entries = [...pointers.current.entries()];
    const a = entries[0];
    const b = entries[1];
    const piece = piecesRef.current.find((p) => p.id === id);
    if (!a || !b || !piece) return;
    ensureBegun();
    gesture.current = {
      mode: "pinch",
      id,
      ids: [a[0], b[0]],
      startDist: dist(a[1], b[1]) || 1,
      startAngle: angleDeg(a[1], b[1]),
      startMid: mid(a[1], b[1]),
      startSize: piece.size,
      startRotation: piece.rotation,
      origin: { x: piece.x, y: piece.y },
    };
  };

  const currentGestureId = (): string | null => {
    const g = gesture.current;
    return g && "id" in g ? g.id : selectedRef.current;
  };

  const handlePiecePointerDown = (e: ReactPointerEvent<SVGGElement>, piece: Piece) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    const pt = toSvg(e.clientX, e.clientY);
    if (!pt) return;
    capture(e.pointerId);
    pointers.current.set(e.pointerId, pt);
    if (pointers.current.size >= 2) {
      const id = currentGestureId() ?? piece.id;
      startPinch(id);
      return;
    }
    onSelect(piece.id);
    gesture.current = {
      mode: "drag",
      id: piece.id,
      pointerId: e.pointerId,
      start: pt,
      startClient: { x: e.clientX, y: e.clientY },
      origin: { x: piece.x, y: piece.y },
      active: false,
    };
  };

  const handleHandlePointerDown = (e: ReactPointerEvent<SVGGElement>, mode: "rotate" | "resize") => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    const piece = piecesRef.current.find((p) => p.id === selectedRef.current);
    const pt = toSvg(e.clientX, e.clientY);
    if (!piece || !pt) return;
    capture(e.pointerId);
    pointers.current.set(e.pointerId, pt);
    if (pointers.current.size >= 2) {
      startPinch(piece.id);
      return;
    }
    ensureBegun();
    const center = { x: piece.x, y: piece.y };
    gesture.current =
      mode === "rotate"
        ? { mode, id: piece.id, center, startAngle: angleDeg(center, pt), startRotation: piece.rotation }
        : { mode, id: piece.id, center, startDist: dist(center, pt) || 1, startSize: piece.size };
  };

  const handleBackgroundPointerDown = (e: ReactPointerEvent<SVGRectElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const pt = toSvg(e.clientX, e.clientY);
    if (!pt) return;
    capture(e.pointerId);
    pointers.current.set(e.pointerId, pt);
    if (pointers.current.size >= 2) {
      const id = currentGestureId();
      if (id) startPinch(id);
      return;
    }
    gesture.current = { mode: "background", startClient: { x: e.clientX, y: e.clientY }, moved: false };
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const pt = toSvg(e.clientX, e.clientY);
    if (!pt) return;
    pointers.current.set(e.pointerId, pt);
    const g = gesture.current;
    if (!g) return;

    switch (g.mode) {
      case "background": {
        if (Math.hypot(e.clientX - g.startClient.x, e.clientY - g.startClient.y) > 6) g.moved = true;
        return;
      }
      case "drag": {
        if (e.pointerId !== g.pointerId) return;
        if (!g.active) {
          const travelled = Math.hypot(e.clientX - g.startClient.x, e.clientY - g.startClient.y);
          if (travelled < DRAG_THRESHOLD_PX) return;
          g.active = true;
          ensureBegun();
        }
        const pos = clampPosition(g.origin.x + pt.x - g.start.x, g.origin.y + pt.y - g.start.y);
        onLiveUpdate((ps) => updatePiece(ps, g.id, pos));
        return;
      }
      case "rotate": {
        const rotation = snapRotation(
          normalizeRotation(g.startRotation + angleDeg(g.center, pt) - g.startAngle),
        );
        onLiveUpdate((ps) => updatePiece(ps, g.id, { rotation }));
        return;
      }
      case "resize": {
        const size = clampSize((g.startSize * dist(g.center, pt)) / g.startDist);
        onLiveUpdate((ps) => updatePiece(ps, g.id, { size }));
        return;
      }
      case "pinch": {
        const a = pointers.current.get(g.ids[0]);
        const b = pointers.current.get(g.ids[1]);
        if (!a || !b) return;
        const m = mid(a, b);
        const patch = {
          size: clampSize((g.startSize * dist(a, b)) / g.startDist),
          rotation: normalizeRotation(g.startRotation + angleDeg(a, b) - g.startAngle),
          ...clampPosition(g.origin.x + m.x - g.startMid.x, g.origin.y + m.y - g.startMid.y),
        };
        onLiveUpdate((ps) => updatePiece(ps, g.id, patch));
        return;
      }
    }
  };

  const handlePointerEnd = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;

    if (pointers.current.size === 0) {
      if (g?.mode === "background" && !g.moved && e.type === "pointerup") onSelect(null);
      gesture.current = null;
      if (begun.current) {
        begun.current = false;
        onEndGesture();
      }
      return;
    }

    // Lifting one finger of a pinch: carry on dragging with the other.
    if (g?.mode === "pinch") {
      const remaining = [...pointers.current.entries()][0];
      const piece = piecesRef.current.find((p) => p.id === g.id);
      if (remaining && piece) {
        gesture.current = {
          mode: "drag",
          id: g.id,
          pointerId: remaining[0],
          start: remaining[1],
          startClient: { x: 0, y: 0 },
          origin: { x: piece.x, y: piece.y },
          active: true,
        };
      }
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<SVGGElement>, piece: Piece) => {
    const step = e.shiftKey ? 40 : 10;
    let patch: Partial<Piece> | null = null;
    switch (e.key) {
      case "ArrowLeft":
        patch = clampPosition(piece.x - step, piece.y);
        break;
      case "ArrowRight":
        patch = clampPosition(piece.x + step, piece.y);
        break;
      case "ArrowUp":
        patch = clampPosition(piece.x, piece.y - step);
        break;
      case "ArrowDown":
        patch = clampPosition(piece.x, piece.y + step);
        break;
      case "[":
        patch = { rotation: normalizeRotation(piece.rotation - 15) };
        break;
      case "]":
        patch = { rotation: normalizeRotation(piece.rotation + 15) };
        break;
      case "+":
      case "=":
        patch = { size: clampSize(piece.size + 10) };
        break;
      case "-":
      case "_":
        patch = { size: clampSize(piece.size - 10) };
        break;
      case "h":
      case "H":
        patch = { flipX: !piece.flipX };
        break;
      case "v":
      case "V":
        patch = { flipY: !piece.flipY };
        break;
      case "Delete":
      case "Backspace":
        if (piece.isDuplicate) {
          e.preventDefault();
          onCommit((ps) => removePiece(ps, piece.id));
          onSelect(null);
        }
        return;
      case "Escape":
        onSelect(null);
        (e.currentTarget as SVGGElement).blur();
        return;
      default:
        return;
    }
    e.preventDefault();
    const finalPatch = patch;
    onCommit((ps) => updatePiece(ps, piece.id, finalPatch));
  };

  const selected = pieces.find((p) => p.id === selectedId) ?? null;
  const half = selected ? selected.size / 2 + 8 / unitPx : 0;
  const stem = 28 / unitPx;
  const visR = 13 / unitPx;
  const hitR = 26 / unitPx;
  const line = 2 / unitPx;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
      className="touch-canvas absolute inset-0 block h-full w-full"
      style={{ touchAction: "none" }}
      role="group"
      aria-label="Picture canvas"
      aria-describedby={describedBy}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <CanvasBackdrop patternId="spb-dots" />
      <rect
        width="100%"
        height="100%"
        style={{ fill: "transparent" }}
        onPointerDown={handleBackgroundPointerDown}
      />

      {pieces.map((piece) => {
        const isSelected = piece.id === selectedId;
        return (
          <g
            key={piece.id}
            transform={pieceTransform(piece)}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            aria-label={`${SYMBOL_LABELS[piece.kind]}${piece.isDuplicate ? " (duplicate)" : ""}. Size ${Math.round(piece.size)}, turned ${Math.round(piece.rotation)} degrees.`}
            className="cursor-grab outline-none active:cursor-grabbing"
            onPointerDown={(e) => handlePiecePointerDown(e, piece)}
            onFocus={() => onSelect(piece.id)}
            onKeyDown={(e) => handleKeyDown(e, piece)}
          >
            <ShapeGraphic kind={piece.kind} hitArea />
          </g>
        );
      })}

      {selected && (
        <g transform={`translate(${selected.x} ${selected.y}) rotate(${selected.rotation})`} data-export-ignore>
          <rect
            x={-half}
            y={-half}
            width={half * 2}
            height={half * 2}
            rx={6 / unitPx}
            pointerEvents="none"
            style={{ fill: "none", stroke: "var(--selection)" }}
            strokeWidth={line}
            strokeDasharray={`${7 / unitPx} ${5 / unitPx}`}
          />
          <line
            x1={0}
            y1={-half}
            x2={0}
            y2={-half - stem}
            pointerEvents="none"
            style={{ stroke: "var(--selection)" }}
            strokeWidth={line}
          />
          {/* Turn handle */}
          <g className="cursor-alias" onPointerDown={(e) => handleHandlePointerDown(e, "rotate")} aria-hidden="true">
            <circle cy={-half - stem} r={hitR} style={{ fill: "transparent" }} />
            <circle
              cy={-half - stem}
              r={visR}
              style={{ fill: "var(--card)", stroke: "var(--selection)" }}
              strokeWidth={line * 1.25}
            />
            <path
              d={`M ${-visR * 0.45} ${-half - stem - visR * 0.1} A ${visR * 0.48} ${visR * 0.48} 0 1 1 ${visR * 0.1} ${-half - stem + visR * 0.47}`}
              pointerEvents="none"
              style={{ fill: "none", stroke: "var(--selection)" }}
              strokeWidth={line}
              strokeLinecap="round"
            />
          </g>
          {/* Resize handle */}
          <g className="cursor-nwse-resize" onPointerDown={(e) => handleHandlePointerDown(e, "resize")} aria-hidden="true">
            <circle cx={half} cy={half} r={hitR} style={{ fill: "transparent" }} />
            <rect
              x={half - visR}
              y={half - visR}
              width={visR * 2}
              height={visR * 2}
              rx={4 / unitPx}
              style={{ fill: "var(--selection)", stroke: "var(--card)" }}
              strokeWidth={line}
            />
            <path
              d={`M ${half - visR * 0.45} ${half + visR * 0.45} L ${half + visR * 0.45} ${half - visR * 0.45}`}
              pointerEvents="none"
              style={{ stroke: "var(--card)" }}
              strokeWidth={line}
              strokeLinecap="round"
            />
          </g>
        </g>
      )}
    </svg>
  );
}