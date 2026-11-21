import { describe, expect, it } from "vitest";

import {
  chooseDuplicate,
  createInitialPieces,
  getPictureStatus,
  parseStoredPieces,
  removePiece,
  updatePiece,
} from "./symbols";

describe("symbol picture rules", () => {
  it("starts with exactly one of each of the four symbols", () => {
    const pieces = createInitialPieces();
    expect(pieces.map((p) => p.kind).sort()).toEqual(["circle", "square", "squiggle", "triangle"]);
    expect(pieces.some((p) => p.isDuplicate)).toBe(false);
  });

  it("cannot finish with only the four starting symbols", () => {
    expect(getPictureStatus(createInitialPieces()).ready).toBe(false);
  });

  it("is ready once one chosen symbol is duplicated, making five pieces", () => {
    const status = getPictureStatus(chooseDuplicate(createInitialPieces(), "circle"));
    expect(status.ready).toBe(true);
    expect(status.pieceCount).toBe(5);
    expect(status.duplicateKind).toBe("circle");
  });

  it("never allows a second duplicate — choosing another symbol swaps it", () => {
    const pieces = chooseDuplicate(chooseDuplicate(createInitialPieces(), "circle"), "triangle");
    expect(pieces).toHaveLength(5);
    expect(pieces.filter((p) => p.isDuplicate).map((p) => p.kind)).toEqual(["triangle"]);
  });

  it("only lets the duplicate be removed, never an original symbol", () => {
    const pieces = chooseDuplicate(createInitialPieces(), "square");
    expect(removePiece(pieces, "square-1")).toHaveLength(5);
    expect(removePiece(pieces, "square-2")).toHaveLength(4);
  });

  it("notices when shapes are still in their starting spots", () => {
    const pieces = chooseDuplicate(createInitialPieces(), "square");
    expect(getPictureStatus(pieces).arranged).toBe(false);
    expect(getPictureStatus(updatePiece(pieces, "circle-1", { x: 300 })).arranged).toBe(true);
  });

  it("rejects a saved picture with two duplicates", () => {
    const bad = [
      ...createInitialPieces(),
      { ...createInitialPieces()[0]!, id: "triangle-2", isDuplicate: true },
      { ...createInitialPieces()[1]!, id: "square-2", isDuplicate: true },
    ];
    expect(parseStoredPieces(JSON.stringify(bad))).toBeNull();
  });
});