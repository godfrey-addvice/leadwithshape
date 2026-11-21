import { ArrowRight, Hand, RefreshCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePictureHistory } from "@/hooks/use-picture-history";
import {
  SYMBOL_KINDS,
  SYMBOL_LABELS,
  bringToFront,
  chooseDuplicate,
  clampSize,
  getPictureStatus,
  normalizeRotation,
  removePiece,
  sendToBack,
  updatePiece,
  type SymbolKind,
} from "@/lib/symbols";

import { Checklist } from "./Checklist";
import { DuplicatePicker } from "./DuplicatePicker";
import { PictureCanvas } from "./PictureCanvas";
import { ResultsView } from "./ResultsView";
import { SymbolGlyph } from "./ShapeGraphic";
import { ToolPanel, type ToolAction } from "./ToolPanel";

export function SymbolBuilder() {
  const history = usePictureHistory();
  const { pieces, commit } = history;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"build" | "results">("build");
  const [finishMessage, setFinishMessage] = useState<string | null>(null);
  const [confirmUnarranged, setConfirmUnarranged] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const status = getPictureStatus(pieces);
  const selected = pieces.find((p) => p.id === selectedId) ?? null;

  // A piece can disappear through Undo; drop a stale selection.
  useEffect(() => {
    if (selectedId && !pieces.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [pieces, selectedId]);

  // Clear the "not ready" message as soon as the picture becomes valid.
  useEffect(() => {
    if (status.ready) setFinishMessage(null);
  }, [status.ready]);

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedId((prev) => {
        if (id && id !== prev) {
          const p = pieces.find((x) => x.id === id);
          if (p) setAnnouncement(`${SYMBOL_LABELS[p.kind]} selected.`);
        }
        return id;
      });
    },
    [pieces],
  );

  const handleTool = (action: ToolAction) => {
    if (!selected) return;
    const id = selected.id;
    const label = SYMBOL_LABELS[selected.kind];
    switch (action) {
      case "rotateLeft":
        commit((ps) => updatePiece(ps, id, { rotation: normalizeRotation(selected.rotation - 15) }));
        break;
      case "rotateRight":
        commit((ps) => updatePiece(ps, id, { rotation: normalizeRotation(selected.rotation + 15) }));
        break;
      case "smaller":
        commit((ps) => updatePiece(ps, id, { size: clampSize(selected.size - 15) }));
        break;
      case "bigger":
        commit((ps) => updatePiece(ps, id, { size: clampSize(selected.size + 15) }));
        break;
      case "flipX":
        commit((ps) => updatePiece(ps, id, { flipX: !selected.flipX }));
        break;
      case "flipY":
        commit((ps) => updatePiece(ps, id, { flipY: !selected.flipY }));
        break;
      case "front":
        commit((ps) => bringToFront(ps, id));
        setAnnouncement(`${label} moved to the front.`);
        break;
      case "back":
        commit((ps) => sendToBack(ps, id));
        setAnnouncement(`${label} moved to the back.`);
        break;
      case "remove":
        commit((ps) => removePiece(ps, id));
        setSelectedId(null);
        setAnnouncement(`Duplicate ${label.toLowerCase()} removed. Choose a duplicate again when you're ready.`);
        break;
    }
  };

  const handleChooseDuplicate = (kind: SymbolKind) => {
    commit((ps) => chooseDuplicate(ps, kind));
    setSelectedId(`${kind}-2`);
    setAnnouncement(`Added a second ${SYMBOL_LABELS[kind].toLowerCase()}. You now have five pieces.`);
  };

  const handleUndo = () => {
    history.undo();
    setConfirmUnarranged(false);
    setAnnouncement("Undone.");
  };

  const handleReset = () => {
    history.reset();
    setSelectedId(null);
    setConfirmUnarranged(false);
    setFinishMessage(null);
    setAnnouncement("Canvas reset to the four starting symbols. Use Undo to get your picture back.");
  };

  const goToResults = () => {
    setSelectedId(null);
    setConfirmUnarranged(false);
    setView("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinish = () => {
    if (!status.ready) {
      setFinishMessage(status.message);
      setAnnouncement(status.message);
      return;
    }
    if (!status.arranged && !confirmUnarranged) {
      setConfirmUnarranged(true);
      return;
    }
    goToResults();
  };

  if (view === "results" && status.duplicateKind) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <ResultsView
          pieces={pieces}
          duplicateKind={status.duplicateKind}
          onEdit={() => {
            setView("build");
            window.scrollTo({ top: 0 });
          }}
          onStartOver={() => {
            handleReset();
            setView("build");
            window.scrollTo({ top: 0 });
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-44 pt-5 sm:px-6 sm:pt-8 lg:pb-12">
      <header className="mb-5 max-w-2xl sm:mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cta">Biblical Leadership · Reflection</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight sm:text-5xl">Symbol Picture Builder</h1>
        <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
          Make a picture from a{" "}
          {SYMBOL_KINDS.map((k, i) => (
            <span key={k} className="whitespace-nowrap">
              <SymbolGlyph kind={k} className="mx-0.5 inline size-4 align-[-2px]" />
              <span className="text-foreground">{SYMBOL_LABELS[k].toLowerCase()}</span>
              {i < 2 ? ", " : i === 2 ? " and " : ""}
            </span>
          ))}
          . Double just one of them — five pieces in all. There are no wrong answers.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="order-2 lg:order-1 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl border bg-canvas shadow-canvas pr-6 lg:pr-0">
            <div className="relative h-full w-full overflow-hidden rounded-l-3xl lg:rounded-3xl">
            <PictureCanvas
              pieces={pieces}
              selectedId={selectedId}
              onSelect={handleSelect}
              onBeginGesture={history.beginGesture}
              onLiveUpdate={history.liveUpdate}
              onEndGesture={history.endGesture}
              onCommit={commit}
              describedBy="canvas-help"
            />
            </div>
            <div aria-label="Swipe here to scroll the page" className="absolute inset-y-0 right-0 z-10 flex w-6 touch-pan-y flex-col items-center justify-center gap-2 border-l border-cta bg-cta text-cta-foreground lg:hidden" style={{ touchAction: "pan-y" }}><span aria-hidden="true" className="text-base leading-none">↑</span><span aria-hidden="true" className="text-xs font-bold tracking-wider" style={{ writingMode: "vertical-rl" }}>SCROLL</span><span aria-hidden="true" className="text-base leading-none">↓</span></div>
          </div>
          <p id="canvas-help" className="mt-2 flex items-start gap-2 text-lg leading-relaxed text-muted-foreground">
            <Hand className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Drag a shape with one finger. Use its handles (or pinch with two fingers) to turn and resize.{" "}
              <span className="hidden sm:inline">Keyboard: Tab to a shape, arrows move, [ ] turn, + − resize, H/V flip.</span>
            </span>
          </p>
        </div>

        <div className="order-1 lg:order-2 lg:col-start-2 lg:row-start-1">
          <DuplicatePicker duplicateKind={status.duplicateKind} onChoose={handleChooseDuplicate} highlight={!!finishMessage && !status.duplicateKind} />
        </div>

        <div className="order-3 space-y-4 lg:col-start-2 lg:row-start-2">
          <ToolPanel selected={selected} onAction={handleTool} />
          <Checklist status={status} />

          {/* Action bar: pinned to the bottom on phones, inline on large screens. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 pt-3 pb-safe shadow-lift backdrop-blur lg:static lg:rounded-2xl lg:border lg:p-4 lg:shadow-soft">
            <div className="mx-auto max-w-6xl">
              <div aria-live="polite" className="empty:hidden">
                {finishMessage && (
                  <p className="mb-2 rounded-xl bg-notice px-3 py-2 text-sm font-medium text-notice-foreground">
                    {finishMessage}
                  </p>
                )}
                {confirmUnarranged && (
                  <div className="mb-2 rounded-xl bg-notice px-3 py-2 text-sm text-notice-foreground">
                    <p className="font-medium">Your shapes are still in their starting spots. Finish anyway?</p>
                    <div className="mt-2 flex gap-2">
                      <Button type="button" size="sm" variant="default" onClick={goToResults}>
                        Yes, finish
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setConfirmUnarranged(false)}>
                        Keep arranging
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="px-3.5"
                  onClick={handleUndo}
                  disabled={!history.canUndo}
                  aria-label="Undo"
                >
                  <Undo2 /> <span className="max-[359px]:sr-only">Undo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="px-3.5"
                  onClick={handleReset}
                  aria-label="Reset canvas"
                >
                  <RefreshCcw /> <span className="max-[359px]:sr-only">Reset</span>
                </Button>
                <Button type="button" variant="cta" size="lg" className="flex-1" onClick={handleFinish}>
                  Finish <ArrowRight />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <footer className="mt-10 border-t pt-5 text-lg leading-relaxed text-muted-foreground">
        A lighthearted reflection activity for leadership groups — a conversation starter, not a psychological
        assessment. No sign-in; your picture stays on this device.
      </footer>
    </main>
  );
}