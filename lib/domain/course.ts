"use client";

// Course domain service — UI calls this rather than touching storage directly.
// Phase 2: backed by the server API (PostgreSQL) instead of IndexedDB. The
// interface is unchanged so all call sites (pages/hooks) keep working.

import type { Course } from "../schema";
import type { CourseRecord } from "../db/types";
import { collectCourseAssetRefs } from "../db/gc"; // pure helper (no IndexedDB at call time)

export interface CourseService {
  list(includeDeleted?: boolean): Promise<CourseRecord[]>;
  get(id: string): Promise<CourseRecord | undefined>;
  create(course: Course, name?: string): Promise<CourseRecord>;
  save(id: string, course: Course): Promise<void>;
  rename(id: string, name: string): Promise<void>;
  duplicate(id: string): Promise<CourseRecord | null>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  purgeOldTrash(days: number): Promise<number>;
  listAssets(courseId: string): Promise<{ fileName: string; file: File }[]>;
  getAsset(courseId: string, fileName: string): Promise<File | undefined>;
  putAsset(courseId: string, file: File, name: string): Promise<void>;
  deleteAsset(courseId: string, fileName: string): Promise<void>;
  loadAssetsAsMap(courseId: string): Promise<Map<string, File>>;
  collectAssetRefs(course: Course): Set<string>;
  purgeOrphanAssets(courseId: string, course: Course): Promise<number>;
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

async function loadAssetsAsMap(courseId: string): Promise<Map<string, File>> {
  const { assets } = await req<{ assets: { fileName: string; mime: string; dataB64: string }[] }>(
    `/api/courses/${courseId}/assets`,
  );
  return new Map(assets.map((a) => [a.fileName, b64ToFile(a.fileName, a.mime, a.dataB64)]));
}

export const courseService: CourseService = {
  async list(includeDeleted = false) {
    const { records } = await req<{ records: CourseRecord[] }>(
      `/api/courses?includeDeleted=${includeDeleted ? "1" : "0"}`,
    );
    return records;
  },
  async get(id) {
    const res = await fetch(`/api/courses/${id}`, { credentials: "same-origin" });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },
  create(course, name) {
    return req<CourseRecord>("/api/courses", jsonInit("POST", { course, name }));
  },
  async save(id, course) {
    await req(`/api/courses/${id}`, jsonInit("PUT", { course }));
  },
  async rename(id, name) {
    await req(`/api/courses/${id}`, jsonInit("PATCH", { action: "rename", name }));
  },
  async duplicate(id) {
    try {
      return await req<CourseRecord>(`/api/courses/${id}/duplicate`, { method: "POST", credentials: "same-origin" });
    } catch {
      return null;
    }
  },
  async softDelete(id) {
    await req(`/api/courses/${id}`, jsonInit("PATCH", { action: "softDelete" }));
  },
  async restore(id) {
    await req(`/api/courses/${id}`, jsonInit("PATCH", { action: "restore" }));
  },
  async hardDelete(id) {
    await req(`/api/courses/${id}`, { method: "DELETE", credentials: "same-origin" });
  },
  async purgeOldTrash(days) {
    const { purged } = await req<{ purged: number }>(`/api/courses/purge-trash?days=${days}`, {
      method: "POST",
      credentials: "same-origin",
    });
    return purged;
  },

  async listAssets(courseId) {
    const map = await loadAssetsAsMap(courseId);
    return [...map].map(([fileName, file]) => ({ fileName, file }));
  },
  async getAsset(courseId, fileName) {
    return (await loadAssetsAsMap(courseId)).get(fileName);
  },
  async putAsset(courseId, file, name) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name);
    await req(`/api/courses/${courseId}/assets`, { method: "PUT", body: fd, credentials: "same-origin" });
  },
  async deleteAsset(courseId, fileName) {
    await req(`/api/courses/${courseId}/assets?name=${encodeURIComponent(fileName)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
  },
  loadAssetsAsMap,

  collectAssetRefs: collectCourseAssetRefs,
  async purgeOrphanAssets(courseId, course) {
    const referenced = collectCourseAssetRefs(course);
    const map = await loadAssetsAsMap(courseId);
    let purged = 0;
    for (const name of map.keys()) {
      if (!referenced.has(name)) {
        await this.deleteAsset(courseId, name);
        purged++;
      }
    }
    return purged;
  },
};
