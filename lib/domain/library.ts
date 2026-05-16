"use client";

import type { Library } from "../library/schema";
import type { LibraryRecord } from "../db/libraries";
import {
  listLibraries, getLibrary, createLibrary, saveLibrary,
  softDeleteLibrary, restoreLibrary, hardDeleteLibrary, emptyLibrary,
} from "../db/libraries";
import {
  listLibraryAssets, putLibraryAsset, deleteLibraryAsset, loadLibraryAssetsAsMap,
} from "../db/library-assets";

export interface LibraryService {
  list(includeDeleted?: boolean): Promise<LibraryRecord[]>;
  get(id: string): Promise<LibraryRecord | undefined>;
  create(library: Library, name?: string): Promise<LibraryRecord>;
  save(id: string, library: Library): Promise<void>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  empty(title?: string, key?: string): Library;
  // Asset CRUD (keys: "shared/<name>" or "<uuid>/<name>")
  listAssets(libraryId: string): Promise<{ assetKey: string; file: File }[]>;
  putAsset(libraryId: string, key: string, file: File): Promise<void>;
  deleteAsset(libraryId: string, key: string): Promise<void>;
  loadAssetsAsMap(libraryId: string): Promise<Map<string, File>>;
}

export const libraryService: LibraryService = {
  list: listLibraries,
  get: getLibrary,
  create: createLibrary,
  save: saveLibrary,
  softDelete: softDeleteLibrary,
  restore: restoreLibrary,
  hardDelete: hardDeleteLibrary,
  empty: emptyLibrary,

  async listAssets(libraryId) {
    const recs = await listLibraryAssets(libraryId);
    return recs.map((r) => ({ assetKey: r.assetKey, file: r.file }));
  },
  putAsset: putLibraryAsset,
  deleteAsset: deleteLibraryAsset,
  loadAssetsAsMap: loadLibraryAssetsAsMap,
};
