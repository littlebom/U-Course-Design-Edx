"use client";

import { useEffect, useState } from "react";

const KEY = "u-coursebuilder:sidebar";

// Persistent sidebar open/closed boolean. Defaults to open. Reads localStorage
// once on mount (so SSR-renders match) and writes back on every change.
export function useSidebarPref(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(localStorage.getItem(KEY) !== "0");
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(KEY, open ? "1" : "0");
  }, [open, hydrated]);

  return [open, setOpen];
}
