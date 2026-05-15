"use client";

import { getDb } from "./index";
import type { AssetRecord } from "./types";

export async function listAssets(courseId: string): Promise<AssetRecord[]> {
  const db = await getDb();
  const idx = db.transaction("assets").store.index("by-course");
  return idx.getAll(IDBKeyRange.only(courseId));
}

export async function getAsset(courseId: string, fileName: string): Promise<AssetRecord | undefined> {
  const db = await getDb();
  return db.get("assets", [courseId, fileName]);
}

export async function putAsset(courseId: string, file: File, customName?: string): Promise<AssetRecord> {
  const fileName = customName ?? file.name;
  const rec: AssetRecord = { courseId, fileName, file, addedAt: Date.now() };
  const db = await getDb();
  await db.put("assets", rec);
  return rec;
}

export async function putAssetBatch(courseId: string, files: Iterable<[string, File]>): Promise<number> {
  const db = await getDb();
  const tx = db.transaction("assets", "readwrite");
  let n = 0;
  for (const [name, file] of files) {
    await tx.store.put({ courseId, fileName: name, file, addedAt: Date.now() });
    n++;
  }
  await tx.done;
  return n;
}

export async function deleteAsset(courseId: string, fileName: string): Promise<void> {
  const db = await getDb();
  await db.delete("assets", [courseId, fileName]);
}

export async function loadAssetsAsMap(courseId: string): Promise<Map<string, File>> {
  const recs = await listAssets(courseId);
  return new Map(recs.map((r) => [r.fileName, r.file]));
}
