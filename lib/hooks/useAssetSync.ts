"use client";

import { useCallback, useRef, useState } from "react";

// Race-safe asset CRUD pattern shared by course and library editors.
//
// React state alone isn't enough because two close-together calls each
// capture the same "previous" state in their closure — the second call's
// diff misses the first call's write. We resolve this with two refs:
//   - latestRef: what we've actually committed (drives the diff)
//   - chainRef:  serialises async writes so a put and delete for the same
//                key can't interleave
//
// Generic over the value type V — caller decides what to store. The diff
// is computed via the `compare` callback (typically reference equality).
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

  const cmp = opts.compare ?? ((a: V, b: V) => a === b);

  const hydrate = useCallback((next: Map<string, V>) => {
    setAssets(next);
    /* eslint-disable-next-line react-hooks/immutability */
    latestRef.current = next;
  }, []);

  const apply = useCallback((next: Map<string, V>): Promise<void> => {
    setAssets(next);
    const run = async () => {
      const prev = latestRef.current;
      /* eslint-disable-next-line react-hooks/immutability */
      latestRef.current = next;
      for (const [k, v] of next) {
        const old = prev.get(k);
        if (old === undefined || !cmp(old, v)) await opts.onPut(k, v);
      }
      for (const k of prev.keys()) {
        if (!next.has(k)) await opts.onDelete(k);
      }
    };
    const chained = chainRef.current.then(run, run);
    /* eslint-disable-next-line react-hooks/immutability */
    chainRef.current = chained.catch((e) => {
      opts.onError?.(e);
    });
    return chained;
  }, [opts, cmp]);

  return { assets, setAssets, hydrate, apply };
}
