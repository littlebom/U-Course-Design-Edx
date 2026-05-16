"use client";

import type { Library } from "../library/schema";
import { librarySchema } from "../library/schema";
import { getDb } from "./index";

function genId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `l_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export interface LibraryRecord {
  id: string;
  name: string;                // cached for list display
  library: Library;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export async function listLibraries(includeDeleted = false): Promise<LibraryRecord[]> {
  const db = await getDb();
  const all = await db.getAll("libraries");
  const filtered = includeDeleted ? all : all.filter((l) => !l.deletedAt);
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getLibrary(id: string): Promise<LibraryRecord | undefined> {
  const db = await getDb();
  return db.get("libraries", id);
}

export async function createLibrary(library: Library, name?: string): Promise<LibraryRecord> {
  const validated = librarySchema.parse(library);
  const now = Date.now();
  const rec: LibraryRecord = {
    id: genId(),
    name: name ?? validated.learningPackage.title,
    library: validated,
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDb();
  await db.put("libraries", rec);
  return rec;
}

export async function saveLibrary(id: string, library: Library): Promise<void> {
  const validated = librarySchema.parse(library);
  const db = await getDb();
  const existing = await db.get("libraries", id);
  if (!existing) throw new Error(`Library ${id} not found`);
  await db.put("libraries", {
    ...existing,
    library: validated,
    name: validated.learningPackage.title,
    updatedAt: Date.now(),
  });
}

export async function softDeleteLibrary(id: string): Promise<void> {
  const db = await getDb();
  const rec = await db.get("libraries", id);
  if (!rec) return;
  rec.deletedAt = Date.now();
  await db.put("libraries", rec);
}

export async function restoreLibrary(id: string): Promise<void> {
  const db = await getDb();
  const rec = await db.get("libraries", id);
  if (!rec) return;
  delete rec.deletedAt;
  rec.updatedAt = Date.now();
  await db.put("libraries", rec);
}

export async function hardDeleteLibrary(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["libraries", "library_assets"], "readwrite");
  await tx.objectStore("libraries").delete(id);
  const idx = tx.objectStore("library_assets").index("by-library");
  let cursor = await idx.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export function emptyLibrary(title = "Untitled Library", key = `lib:NEW:${Date.now()}`): Library {
  return {
    meta: {
      formatVersion: 1,
      createdBy: "",
      createdByEmail: "",
      createdAt: new Date().toISOString(),
      originServer: "",
    },
    learningPackage: {
      title,
      key,
      description: "",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
    entities: [],
    collections: [],
  };
}
