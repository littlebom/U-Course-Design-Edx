"use client";

import { getDb } from "./index";

// Library asset records — keyed by [libraryId, assetKey] where assetKey is
// usually "<uuid>/<filename>" matching the path used by Library v2 inside
// entities/xblock.v1/<type>/<uuid>/component_versions/v<N>/static/<filename>.

export interface LibraryAssetRecord {
  libraryId: string;
  assetKey: string;
  file: File;
  addedAt: number;
}

export async function listLibraryAssets(libraryId: string): Promise<LibraryAssetRecord[]> {
  const db = await getDb();
  const idx = db.transaction("library_assets").store.index("by-library");
  return idx.getAll(IDBKeyRange.only(libraryId));
}

export async function putLibraryAsset(libraryId: string, assetKey: string, file: File): Promise<void> {
  const db = await getDb();
  await db.put("library_assets", { libraryId, assetKey, file, addedAt: Date.now() });
}

export async function deleteLibraryAsset(libraryId: string, assetKey: string): Promise<void> {
  const db = await getDb();
  await db.delete("library_assets", [libraryId, assetKey]);
}

export async function loadLibraryAssetsAsMap(libraryId: string): Promise<Map<string, File>> {
  const recs = await listLibraryAssets(libraryId);
  return new Map(recs.map((r) => [r.assetKey, r.file]));
}
