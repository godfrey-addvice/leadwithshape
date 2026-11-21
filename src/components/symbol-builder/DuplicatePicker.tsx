import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SYMBOL_KINDS, SYMBOL_LABELS, type SymbolKind } from "@/lib/symbols";
import { cn } from "@/lib/utils";

import { SymbolGlyph } from "./ShapeGraphic";

export function DuplicatePicker({
  duplicateKind,
  onChoose,
  highlight,
}: {
  duplicateKind: SymbolKind | null;
  onChoose: (kind: SymbolKind) => void;
  highlight: boolean;
}) {
  return (
    <section
      aria-labelledby="duplicate-heading"
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-soft transition-shadow",
        highlight && "border-cta ring-2 ring-cta/40",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 id="duplicate-heading" className="text-lg font-semibold">
          Choose your duplicate
        </h2>
        {duplicateKind ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-success-foreground">
            <Check className="size-3.5" aria-hidden="true" /> Done
          </span>
        ) : (
          <span className="rounded-full bg-notice px-2.5 py-1 text-xs font-semibold text-notice-foreground">
            Needed
          </span>
        )}
      </div>
      <p id="duplicate-help" className="mb-3 text-lg leading-relaxed text-muted-foreground">
        Add a second copy of exactly <strong className="text-foreground">one</strong> symbol — whichever feels most
        like you. You can switch your choice anytime.
      </p>
      <div className="grid grid-cols-4 gap-2" role="group" aria-describedby="duplicate-help">
        {SYMBOL_KINDS.map((kind) => {
          const chosen = duplicateKind === kind;
          return (
            <Button
              key={kind}
              type="button"
              variant="choice"
              size="tool"
              aria-pressed={chosen}
              onClick={() => onChoose(kind)}
            >
              <SymbolGlyph kind={kind} className="size-9" />
              <span>{SYMBOL_LABELS[kind]}</span>
            </Button>
          );
        })}
      </div>
      <p className="mt-3 text-lg leading-relaxed" aria-live="polite">
        {duplicateKind ? (
          <>
            You doubled the <strong>{SYMBOL_LABELS[duplicateKind].toLowerCase()}</strong> — five pieces in all.
          </>
        ) : (
          <span className="text-muted-foreground">Four pieces so far. One more to go!</span>
        )}
      </p>
    </section>
  );
}