"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CourseRecord, AssetRecord, MetaKey } from "./types";
import type { LibraryRecord } from "./libraries";
import type { LibraryAssetRecord } from "./library-assets";

interface UCourseBuilderDB extends DBSchema {
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
  libraries: {
    key: string;
    value: LibraryRecord;
    indexes: { "by-updatedAt": number };
  };
  library_assets: {
    key: [string, string]; // [libraryId, assetKey]
    value: LibraryAssetRecord;
    indexes: { "by-library": string };
  };
  meta: {
    key: MetaKey;
    value: { key: MetaKey; value: unknown };
  };
}

const DB_NAME = "u-coursebuilder";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<UCourseBuilderDB>> | null = null;

// Wraps openDB so a stuck upgrade (other tab holding old version) doesn't hang the UI forever.
function withTimeout<T>(p: Promise<T>, ms: number, hint: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`Database open timed out after ${ms}ms — ${hint}`));
    }, ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// Wipe the entire database (for unrecoverable state, exposed via window.__resetDb()).
export async function deleteEntireDb(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("delete blocked — close other tabs"));
  });
}

export function getDb(): Promise<IDBPDatabase<UCourseBuilderDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available (SSR)"));
  }
  if (!dbPromise) {
    // Expose a manual escape hatch in browser console: window.__resetDb()
    if (typeof window !== "undefined") {
      (window as unknown as { __resetDb?: () => Promise<void> }).__resetDb = async () => {
        await deleteEntireDb();
        window.location.reload();
      };
    }
    console.info("[db] opening", DB_NAME, "v" + DB_VERSION);
    dbPromise = withTimeout(openDB<UCourseBuilderDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.info("[db] upgrade", oldVersion, "→", newVersion);
        if (oldVersion < 1) {
          const courses = db.createObjectStore("courses", { keyPath: "id" });
          courses.createIndex("by-updatedAt", "updatedAt");
          const assets = db.createObjectStore("assets", { keyPath: ["courseId", "fileName"] });
          assets.createIndex("by-course", "courseId");
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("libraries")) {
            const libs = db.createObjectStore("libraries", { keyPath: "id" });
            libs.createIndex("by-updatedAt", "updatedAt");
          }
          if (!db.objectStoreNames.contains("library_assets")) {
            const libAssets = db.createObjectStore("library_assets", { keyPath: ["libraryId", "assetKey"] });
            libAssets.createIndex("by-library", "libraryId");
          }
        }
        console.info("[db] upgrade done; stores:", Array.from(db.objectStoreNames));
      },
      blocked(currentVersion, blockedVersion) {
        console.warn("[db] BLOCKED — another tab holds", currentVersion, "blocking", blockedVersion);
        if (typeof window !== "undefined") {
          alert(
            `กรุณาปิดแท็บอื่นของแอปนี้ก่อน — มีแท็บเก่าค้างอยู่และบล็อกการอัปเกรดฐานข้อมูล\n` +
            `(current: ${currentVersion}, blocked: ${blockedVersion})`,
          );
        }
      },
      blocking() {
        console.warn("[db] BLOCKING — this tab is preventing another tab's upgrade; closing & reloading");
        getDb().then((db) => db.close()).catch(() => {});
        dbPromise = null;
        if (typeof window !== "undefined") window.location.reload();
      },
      terminated() {
        console.warn("[db] connection terminated unexpectedly");
        dbPromise = null;
      },
    }), 5000, "ปิดแท็บอื่นของแอปนี้แล้วลองใหม่ หรือกดปุ่ม รีเซ็ตฐานข้อมูล");
    // Reset dbPromise on failure so the next call can retry
    dbPromise.catch(() => { dbPromise = null; });
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
