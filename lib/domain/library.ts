"use client";

// Library domain service — Phase 2: server API (PostgreSQL) backed. Interface
// unchanged from the IndexedDB version so all call sites keep working.

import type { Library } from "../library/schema";
import type { LibraryRecord } from "../db/libraries";
import { emptyLibrary } from "../db/libraries"; // pure factory (no IndexedDB at call time)

export interface LibraryService {
  list(includeDeleted?: boolean): Promise<LibraryRecord[]>;
  get(id: string): Promise<LibraryRecord | undefined>;
  create(library: Library, name?: string): Promise<LibraryRecord>;
  save(id: string, library: Library): Promise<void>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  empty(title?: string, key?: string): Library;
  listAssets(libraryId: string): Promise<{ assetKey: string; file: File }[]>;
  putAsset(libraryId: string, key: string, file: File): Promise<void>;
  deleteAsset(libraryId: string, key: string): Promise<void>;
  loadAssetsAsMap(libraryId: string): Promise<Map<string, File>>;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg?.error || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function b64ToFile(name: string, mime: string, b64: string): File {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

async function loadAssetsAsMap(libraryId: string): Promise<Map<string, File>> {
  const { assets } = await req<{ assets: { assetKey: string; mime: string; dataB64: string }[] }>(
    `/api/libraries/${libraryId}/assets`,
  );
  return new Map(assets.map((a) => [a.assetKey, b64ToFile(a.assetKey.split("/").pop() || a.assetKey, a.mime, a.dataB64)]));
}

export const libraryService: LibraryService = {
  async list(includeDeleted = false) {
    const { records } = await req<{ records: LibraryRecord[] }>(
      `/api/libraries?includeDeleted=${includeDeleted ? "1" : "0"}`,
    );
    return records;
  },
  async get(id) {
    const res = await fetch(`/api/libraries/${id}`, { credentials: "same-origin" });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },
  create(library, name) {
    return req<LibraryRecord>("/api/libraries", jsonInit("POST", { library, name }));
  },
  async save(id, library) {
    await req(`/api/libraries/${id}`, jsonInit("PUT", { library }));
  },
  async softDelete(id) {
    await req(`/api/libraries/${id}`, jsonInit("PATCH", { action: "softDelete" }));
  },
  async restore(id) {
    await req(`/api/libraries/${id}`, jsonInit("PATCH", { action: "restore" }));
  },
  async hardDelete(id) {
    await req(`/api/libraries/${id}`, { method: "DELETE", credentials: "same-origin" });
  },
  empty: emptyLibrary,

  async listAssets(libraryId) {
    const map = await loadAssetsAsMap(libraryId);
    return [...map].map(([assetKey, file]) => ({ assetKey, file }));
  },
  async putAsset(libraryId, key, file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("key", key);
    await req(`/api/libraries/${libraryId}/assets`, { method: "PUT", body: fd, credentials: "same-origin" });
  },
  async deleteAsset(libraryId, key) {
    await req(`/api/libraries/${libraryId}/assets?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
  },
  loadAssetsAsMap,
};
