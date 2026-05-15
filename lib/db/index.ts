"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CourseRecord, AssetRecord, MetaKey } from "./types";

interface OlxBuilderDB extends DBSchema {
  courses: {
    key: string;
    value: CourseRecord;
    indexes: { "by-updatedAt": number };
  };
  assets: {
    key: [string, string]; // [courseId, fileName]
    value: AssetRecord;
    indexes: { "by-course": string };
  };
  meta: {
    key: MetaKey;
    value: { key: MetaKey; value: unknown };
  };
}

const DB_NAME = "olx-builder";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OlxBuilderDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<OlxBuilderDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available (SSR)"));
  }
  if (!dbPromise) {
    dbPromise = openDB<OlxBuilderDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("courses")) {
          const courses = db.createObjectStore("courses", { keyPath: "id" });
          courses.createIndex("by-updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("assets")) {
          const assets = db.createObjectStore("assets", { keyPath: ["courseId", "fileName"] });
          assets.createIndex("by-course", "courseId");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getMeta<T = unknown>(key: MetaKey): Promise<T | undefined> {
  const db = await getDb();
  const rec = await db.get("meta", key);
  return rec?.value as T | undefined;
}

export async function setMeta<T = unknown>(key: MetaKey, value: T): Promise<void> {
  const db = await getDb();
  await db.put("meta", { key, value });
}

// Best-effort storage estimate (% used of available quota)
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
}
