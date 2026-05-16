"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Race-safe asset CRUD pattern shared by course and library editors.
//
// React state alone isn't enough because two close-together calls each
// capture the same "previous" state in their closure — the second call's
// diff misses the first call's write. We resolve this with two refs:
//   - latestRef: what we've actually committed (drives the diff)
//   - chainRef:  serialises async writes so a put and delete for the same
//                key can't interleave
//
// The returned `hydrate` and `apply` callbacks must be REFERENCE-STABLE
// across renders so callers can put them in useEffect deps without
// triggering re-runs every render. We achieve this by stashing the options
// object in a ref that we update each render — the callback reads from the
// ref rather than from a closure dep.
export interface UseAssetSyncOptions<V> {
  // Called for entries that are new or whose value changed
  onPut: (key: string, value: V) => Promise<void>;
  // Called for entries that disappeared
  onDelete: (key: string) => Promise<void>;
  // Defaults to reference equality; override when you need deeper checks
  compare?: (prev: V, next: V) => boolean;
  // Called when a sync run rejects so the UI can surface it
  onError?: (err: unknown) => void;
}

export interface UseAssetSyncResult<V> {
  assets: Map<string, V>;
  setAssets: (next: Map<string, V>) => void;
  // Imperative way to seed the in-memory state (e.g. after initial DB load)
  hydrate: (next: Map<string, V>) => void;
  // The function you wire into AssetUploader's onChange
  apply: (next: Map<string, V>) => Promise<void>;
}

export function useAssetSync<V>(opts: UseAssetSyncOptions<V>): UseAssetSyncResult<V> {
  const [assets, setAssets] = useState<Map<string, V>>(new Map());
  const latestRef = useRef<Map<string, V>>(new Map());
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  // Stable holder for the (possibly-inlined) options object. Updated each
  // render so callbacks always see the latest closures without becoming
  // unstable themselves.
  const optsRef = useRef(opts);
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/immutability */
    optsRef.current = opts;
  });

  const hydrate = useCallback((next: Map<string, V>) => {
    setAssets(next);
    /* eslint-disable-next-line react-hooks/immutability */
    latestRef.current = next;
  }, []);

  const apply = useCallback((next: Map<string, V>): Promise<void> => {
    setAssets(next);
    const run = async () => {
      const o = optsRef.current;
      const cmp = o.compare ?? ((a: V, b: V) => a === b);
      const prev = latestRef.current;
      /* eslint-disable-next-line react-hooks/immutability */
      latestRef.current = next;
      for (const [k, v] of next) {
        const old = prev.get(k);
        if (old === undefined || !cmp(old, v)) await o.onPut(k, v);
      }
      for (const k of prev.keys()) {
        if (!next.has(k)) await o.onDelete(k);
      }
    };
    const chained = chainRef.current.then(run, run);
    /* eslint-disable-next-line react-hooks/immutability */
    chainRef.current = chained.catch((e) => {
      optsRef.current.onError?.(e);
    });
    return chained;
  }, []);

  return { assets, setAssets, hydrate, apply };
}
