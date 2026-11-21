import {
  BringToFront,
  FlipHorizontal2,
  FlipVertical2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  SendToBack,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_SIZE, MIN_SIZE, SYMBOL_LABELS, type Piece } from "@/lib/symbols";

import { SymbolGlyph } from "./ShapeGraphic";

export type ToolAction =
  | "rotateLeft"
  | "rotateRight"
  | "smaller"
  | "bigger"
  | "flipX"
  | "flipY"
  | "front"
  | "back"
  | "remove";

export function ToolPanel({ selected, onAction }: { selected: Piece | null; onAction: (a: ToolAction) => void }) {
  const off = !selected;
  const tools: { action: ToolAction; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { action: "rotateLeft", label: "Turn left", icon: <RotateCcw /> },
    { action: "rotateRight", label: "Turn right", icon: <RotateCw /> },
    { action: "smaller", label: "Smaller", icon: <Minus />, disabled: !!selected && selected.size <= MIN_SIZE },
    { action: "bigger", label: "Bigger", icon: <Plus />, disabled: !!selected && selected.size >= MAX_SIZE },
    { action: "flipX", label: "Mirror", icon: <FlipHorizontal2 /> },
    { action: "flipY", label: "Flip", icon: <FlipVertical2 /> },
    { action: "front", label: "To front", icon: <BringToFront /> },
    { action: "back", label: "To back", icon: <SendToBack /> },
  ];

  return (
    <section aria-labelledby="tools-heading" className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-3 flex min-h-9 items-center gap-2">
        {selected ? (
          <>
            <SymbolGlyph kind={selected.kind} className="size-7" />
            <h2 id="tools-heading" className="text-lg font-semibold">
              {SYMBOL_LABELS[selected.kind]}
              {selected.isDuplicate && (
                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle font-sans text-xs font-semibold text-accent-foreground">
                  duplicate
                </span>
              )}
            </h2>
          </>
        ) : (
          <h2 id="tools-heading" className="text-lg font-semibold text-muted-foreground">
            Tap a shape to adjust it
          </h2>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tools.map((t) => (
          <Button
            key={t.action}
            type="button"
            variant="tool"
            size="tool"
            disabled={off || t.disabled}
            onClick={() => onAction(t.action)}
            aria-label={selected ? `${t.label} ${SYMBOL_LABELS[selected.kind]}` : t.label}
          >
            {t.icon}
            <span>{t.label}</span>
          </Button>
        ))}
      </div>
      {selected?.isDuplicate && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-3 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onAction("remove")}
        >
          <Trash2 /> Remove this duplicate
        </Button>
      )}
    </section>
  );
}