"use client";

import { useEffect, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseDebouncedAutosaveResult {
  status: SaveStatus;
  savedAt: number | null;
  // Setter so the data load path can mark "saved" without firing a write
  markSaved: () => void;
}

// Debounces a save() callback by `delayMs` whenever `value` changes after
// the `enabled` flag flips on. Tracks status + savedAt for the UI indicator.
export function useDebouncedAutosave<T>(
  value: T,
  enabled: boolean,
  delayMs: number,
  save: (v: T) => Promise<void>,
): UseDebouncedAutosaveResult {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(async () => {
      setStatus("saving");
      try {
        await save(value);
        setStatus("saved");
        setSavedAt(Date.now());
      } catch {
        setStatus("error");
      }
    }, delayMs);
    return () => clearTimeout(t);
  }, [value, enabled, delayMs, save]);

  return {
    status,
    savedAt,
    markSaved: () => { setStatus("saved"); setSavedAt(Date.now()); },
  };
}
