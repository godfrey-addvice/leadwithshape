import type { Piece, SymbolKind } from "@/lib/symbols";
import { cn } from "@/lib/utils";

/** Colours are applied through `style` (not presentation attributes) so CSS variables resolve in every browser. */
export const SHAPE_COLOR: Record<SymbolKind, string> = {
  triangle: "var(--shape-triangle)",
  square: "var(--shape-square)",
  circle: "var(--shape-circle)",
  squiggle: "var(--shape-squiggle)",
};

const OUTLINE = { stroke: "var(--shape-outline)", strokeWidth: 2.5, strokeLinejoin: "round" } as const;

/** Each symbol is drawn in a 100×100 box centred on 0,0. */
export function ShapeGraphic({ kind, hitArea = false }: { kind: SymbolKind; hitArea?: boolean }) {
  const color = SHAPE_COLOR[kind];
  switch (kind) {
    case "triangle":
      return <polygon points="0,-46 50,42 -50,42" style={{ fill: color }} {...OUTLINE} />;
    case "square":
      return <rect x={-44} y={-44} width={88} height={88} rx={3} style={{ fill: color }} {...OUTLINE} />;
    case "circle":
      return <circle r={46} style={{ fill: color }} {...OUTLINE} />;
    case "squiggle":
      return (
        <>
          {hitArea && <rect x={-54} y={-30} width={108} height={60} style={{ fill: "transparent" }} />}
          <path
            d="M -46 0 Q -34.5 -38 -23 0 T 0 0 T 23 0 T 46 0"
            style={{ fill: "none", stroke: color }}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
  }
}

export function pieceTransform(p: Piece): string {
  const s = p.size / 100;
  return `translate(${p.x} ${p.y}) rotate(${p.rotation}) scale(${p.flipX ? -s : s} ${p.flipY ? -s : s})`;
}

/** Small standalone icon of a symbol, for buttons and cards. */
export function SymbolGlyph({ kind, className }: { kind: SymbolKind; className?: string }) {
  return (
    <svg viewBox="-56 -56 112 112" className={cn("size-8 shrink-0", className)} aria-hidden="true" focusable="false">
      <ShapeGraphic kind={kind} />
    </svg>
  );
}

export function CanvasBackdrop({ patternId }: { patternId: string }) {
  return (
    <>
      <defs>
        <pattern id={patternId} width={30} height={30} patternUnits="userSpaceOnUse">
          <circle cx={15} cy={15} r={1.6} style={{ fill: "var(--canvas-dot)" }} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" style={{ fill: "var(--canvas)" }} />
      <rect width="100%" height="100%" style={{ fill: `url(#${patternId})` }} />
    </>
  );
}