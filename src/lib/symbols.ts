/**
 * Pure rules for the Symbol Picture activity.
 * Four symbols always present; exactly one may be duplicated (five pieces total).
 */
export type SymbolKind = "triangle" | "square" | "circle" | "squiggle";

export const SYMBOL_KINDS: readonly SymbolKind[] = ["triangle", "square", "circle", "squiggle"];

export const SYMBOL_LABELS: Record<SymbolKind, string> = {
  triangle: "Triangle",
  square: "Square",
  circle: "Circle",
  squiggle: "Squiggle",
};

/** Canvas is a square coordinate space; the SVG scales it to any screen. */
export const CANVAS_SIZE = 600;
export const MIN_SIZE = 50;
export const MAX_SIZE = 340;
export const DEFAULT_SIZE = 130;
export const TOTAL_PIECES = 5;
/** Keep a piece's centre at least this far inside the canvas so it can't be lost. */
export const EDGE_MARGIN = 24;

export interface Piece {
  id: string;
  kind: SymbolKind;
  x: number;
  y: number;
  size: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  isDuplicate: boolean;
}

const START_POSITIONS: Record<SymbolKind, { x: number; y: number }> = {
  triangle: { x: 160, y: 165 },
  square: { x: 440, y: 165 },
  circle: { x: 160, y: 435 },
  squiggle: { x: 440, y: 435 },
};

export function createInitialPieces(): Piece[] {
  return SYMBOL_KINDS.map((kind) => ({
    id: `${kind}-1`,
    kind,
    x: START_POSITIONS[kind].x,
    y: START_POSITIONS[kind].y,
    size: DEFAULT_SIZE,
    rotation: 0,
    flipX: false,
    flipY: false,
    isDuplicate: false,
  }));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampSize(size: number): number {
  return Math.round(clamp(size, MIN_SIZE, MAX_SIZE));
}

export function clampPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: clamp(x, EDGE_MARGIN, CANVAS_SIZE - EDGE_MARGIN),
    y: clamp(y, EDGE_MARGIN, CANVAS_SIZE - EDGE_MARGIN),
  };
}

/** Normalise any angle to the range (-180, 180]. */
export function normalizeRotation(deg: number): number {
  let r = deg % 360;
  if (r > 180) r -= 360;
  if (r <= -180) r += 360;
  return Math.round(r * 10) / 10;
}

/** Gently snap to the nearest 45° when within a few degrees. */
export function snapRotation(deg: number, tolerance = 4): number {
  const nearest = Math.round(deg / 45) * 45;
  return Math.abs(deg - nearest) <= tolerance ? normalizeRotation(nearest) : deg;
}

export function getDuplicateKind(pieces: Piece[]): SymbolKind | null {
  return pieces.find((p) => p.isDuplicate)?.kind ?? null;
}

export function updatePiece(pieces: Piece[], id: string, patch: Partial<Piece>): Piece[] {
  return pieces.map((p) => (p.id === id ? { ...p, ...patch, id: p.id, kind: p.kind } : p));
}

/**
 * Choose which symbol is doubled. If another symbol was already doubled,
 * the duplicate is swapped (keeping its spot) so there is never more than one.
 */
export function chooseDuplicate(pieces: Piece[], kind: SymbolKind): Piece[] {
  const existing = pieces.find((p) => p.isDuplicate);
  if (existing?.kind === kind) return pieces;
  if (existing) {
    return pieces.map((p) =>
      p.isDuplicate ? { ...p, id: `${kind}-2`, kind, flipX: false, flipY: false } : p,
    );
  }
  const original = pieces.find((p) => p.kind === kind && !p.isDuplicate);
  const base = original ?? { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, size: DEFAULT_SIZE };
  const pos = clampPosition(base.x + 70, base.y - 60);
  return [
    ...pieces,
    {
      id: `${kind}-2`,
      kind,
      x: pos.x,
      y: pos.y,
      size: base.size,
      rotation: 0,
      flipX: false,
      flipY: false,
      isDuplicate: true,
    },
  ];
}

export function canRemove(piece: Piece): boolean {
  return piece.isDuplicate;
}

/** Only the duplicate can be removed; the four original symbols always stay. */
export function removePiece(pieces: Piece[], id: string): Piece[] {
  const target = pieces.find((p) => p.id === id);
  if (!target || !canRemove(target)) return pieces;
  return pieces.filter((p) => p.id !== id);
}

export function bringToFront(pieces: Piece[], id: string): Piece[] {
  const target = pieces.find((p) => p.id === id);
  if (!target) return pieces;
  return [...pieces.filter((p) => p.id !== id), target];
}

export function sendToBack(pieces: Piece[], id: string): Piece[] {
  const target = pieces.find((p) => p.id === id);
  if (!target) return pieces;
  return [target, ...pieces.filter((p) => p.id !== id)];
}

/** True once any original symbol has been moved, resized, turned or flipped. */
export function hasBeenArranged(pieces: Piece[]): boolean {
  const initial = createInitialPieces();
  return initial.some((start) => {
    const now = pieces.find((p) => p.id === start.id);
    if (!now) return false;
    return (
      Math.abs(now.x - start.x) > 4 ||
      Math.abs(now.y - start.y) > 4 ||
      now.size !== start.size ||
      now.rotation !== start.rotation ||
      now.flipX !== start.flipX ||
      now.flipY !== start.flipY
    );
  });
}

export interface PictureStatus {
  hasAllFour: boolean;
  duplicateKind: SymbolKind | null;
  pieceCount: number;
  arranged: boolean;
  ready: boolean;
  /** Friendly explanation of what is still needed (empty when ready). */
  message: string;
}

export function getPictureStatus(pieces: Piece[]): PictureStatus {
  const hasAllFour = SYMBOL_KINDS.every((k) => pieces.some((p) => p.kind === k && !p.isDuplicate));
  const duplicates = pieces.filter((p) => p.isDuplicate);
  const duplicateKind = duplicates.length === 1 ? (duplicates[0]?.kind ?? null) : null;
  const pieceCount = pieces.length;
  const ready = hasAllFour && duplicateKind !== null && pieceCount === TOTAL_PIECES;

  let message = "";
  if (!hasAllFour) {
    message = "Something's missing — tap Reset to bring back all four symbols.";
  } else if (duplicates.length === 0) {
    message =
      "Almost there! Choose one symbol to duplicate so your picture has five pieces.";
  } else if (!ready) {
    message = "Your picture needs exactly five pieces: the four symbols plus one duplicate.";
  }

  return { hasAllFour, duplicateKind, pieceCount, arranged: hasBeenArranged(pieces), ready, message };
}

function isPiece(value: unknown): value is Piece {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["kind"] === "string" &&
    (SYMBOL_KINDS as readonly string[]).includes(v["kind"] as string) &&
    [v["x"], v["y"], v["size"], v["rotation"]].every(
      (n) => typeof n === "number" && Number.isFinite(n),
    ) &&
    typeof v["flipX"] === "boolean" &&
    typeof v["flipY"] === "boolean" &&
    typeof v["isDuplicate"] === "boolean"
  );
}

/** Safely restore a saved picture; returns null if anything looks wrong. */
export function parseStoredPieces(raw: string | null): Piece[] | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(isPiece)) return null;
    const pieces = data.map((p) => ({
      ...p,
      ...clampPosition(p.x, p.y),
      size: clampSize(p.size),
      rotation: normalizeRotation(p.rotation),
    }));
    const status = getPictureStatus(pieces);
    const duplicates = pieces.filter((p) => p.isDuplicate).length;
    if (!status.hasAllFour || duplicates > 1 || pieces.length !== 4 + duplicates) return null;
    return pieces;
  } catch {
    return null;
  }
}