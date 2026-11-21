import { useCallback, useEffect, useRef, useState } from "react";

import { createInitialPieces, parseStoredPieces, type Piece } from "@/lib/symbols";

const STORAGE_KEY = "symbol-picture-builder:v1";
const HISTORY_LIMIT = 100;

interface HistoryState {
  past: Piece[][];
  present: Piece[];
}

type Updater = (pieces: Piece[]) => Piece[];

/**
 * Picture state with undo. Discrete actions use `commit`; continuous gestures
 * (drag, pinch, handles) call `beginGesture` → `liveUpdate`… → `endGesture`
 * so a whole gesture becomes a single undo step.
 * The picture is kept on this device only (localStorage) so a reload doesn't lose it.
 */
export function usePictureHistory() {
  const [state, setState] = useState<HistoryState>(() => ({
    past: [],
    present: createInitialPieces(),
  }));
  const [hydrated, setHydrated] = useState(false);
  const gestureBase = useRef<Piece[] | null>(null);
  const presentRef = useRef(state.present);
  presentRef.current = state.present;

  useEffect(() => {
    try {
      const restored = parseStoredPieces(window.localStorage.getItem(STORAGE_KEY));
      if (restored) setState({ past: [], present: restored });
    } catch {
      // Private browsing or storage disabled: just start fresh.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.present));
    } catch {
      // Ignore storage failures; the activity still works.
    }
  }, [state.present, hydrated]);

  const commit = useCallback((updater: Updater) => {
    setState((s) => {
      const next = updater(s.present);
      if (next === s.present) return s;
      return { past: [...s.past, s.present].slice(-HISTORY_LIMIT), present: next };
    });
  }, []);

  const beginGesture = useCallback(() => {
    gestureBase.current = presentRef.current;
  }, []);

  const liveUpdate = useCallback((updater: Updater) => {
    setState((s) => {
      const next = updater(s.present);
      return next === s.present ? s : { ...s, present: next };
    });
  }, []);

  const endGesture = useCallback(() => {
    const base = gestureBase.current;
    gestureBase.current = null;
    if (!base) return;
    setState((s) =>
      s.present === base
        ? s
        : { past: [...s.past, base].slice(-HISTORY_LIMIT), present: s.present },
    );
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      const previous = s.past[s.past.length - 1];
      if (!previous) return s;
      return { past: s.past.slice(0, -1), present: previous };
    });
  }, []);

  const reset = useCallback(() => {
    commit(() => createInitialPieces());
  }, [commit]);

  return {
    pieces: state.present,
    canUndo: state.past.length > 0,
    commit,
    beginGesture,
    liveUpdate,
    endGesture,
    undo,
    reset,
  };
}