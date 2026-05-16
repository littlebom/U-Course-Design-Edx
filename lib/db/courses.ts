"use client";

import type { Course } from "../schema";
import { courseSchema } from "../schema";
import { getDb } from "./index";
import type { CourseRecord } from "./types";

import { uuidV4 } from "../uuid";

function genId(): string {
  return uuidV4();
}

function deriveName(course: Course): string {
  return course.course.displayName?.trim()
    || `${course.course.org}/${course.course.courseCode}/${course.course.run}`
    || "Untitled course";
}

export async function listCourses(includeDeleted = false): Promise<CourseRecord[]> {
  const db = await getDb();
  const all = await db.getAll("courses");
  const filtered = includeDeleted ? all : all.filter((c) => !c.deletedAt);
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCourse(id: string): Promise<CourseRecord | undefined> {
  const db = await getDb();
  return db.get("courses", id);
}

export async function createCourse(course: Course, name?: string): Promise<CourseRecord> {
  const validated = courseSchema.parse(course);
  const now = Date.now();
  const rec: CourseRecord = {
    id: genId(),
    name: name ?? deriveName(validated),
    course: validated,
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDb();
  await db.put("courses", rec);
  return rec;
}

export async function saveCourse(id: string, course: Course): Promise<void> {
  const validated = courseSchema.parse(course);
  const db = await getDb();
  const existing = await db.get("courses", id);
  if (!existing) throw new Error(`Course ${id} not found`);
  const rec: CourseRecord = {
    ...existing,
    course: validated,
    name: deriveName(validated),
    updatedAt: Date.now(),
  };
  await db.put("courses", rec);
}

export async function renameCourse(id: string, name: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get("courses", id);
  if (!existing) return;
  existing.name = name;
  existing.updatedAt = Date.now();
  await db.put("courses", existing);
}

// Soft-delete: mark deletedAt; restored within trash window. Hard delete also wipes assets.
export async function softDeleteCourse(id: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get("courses", id);
  if (!existing) return;
  existing.deletedAt = Date.now();
  await db.put("courses", existing);
}

export async function restoreCourse(id: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get("courses", id);
  if (!existing) return;
  delete existing.deletedAt;
  existing.updatedAt = Date.now();
  await db.put("courses", existing);
}

export async function hardDeleteCourse(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["courses", "assets"], "readwrite");
  await tx.objectStore("courses").delete(id);
  const idx = tx.objectStore("assets").index("by-course");
  let cursor = await idx.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function duplicateCourse(id: string): Promise<CourseRecord | null> {
  const db = await getDb();
  const src = await db.get("courses", id);
  if (!src) return null;
  // Clone course JSON; rename run to "<run>-copy"
  const cloned: Course = structuredClone(src.course);
  cloned.course.run = `${cloned.course.run}-copy`;
  cloned.course.displayName = `${cloned.course.displayName} (Copy)`;
  const newRec = await createCourse(cloned);
  // Copy assets
  const tx = db.transaction("assets", "readwrite");
  const idx = tx.store.index("by-course");
  let cursor = await idx.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    const a = cursor.value;
    await tx.store.put({ courseId: newRec.id, fileName: a.fileName, file: a.file, addedAt: Date.now() });
    cursor = await cursor.continue();
  }
  await tx.done;
  return newRec;
}

// Auto-purge soft-deleted courses older than N days (call on app load).
export async function purgeOldTrash(daysToKeep = 7): Promise<number> {
  const db = await getDb();
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const all = await db.getAll("courses");
  let n = 0;
  for (const c of all) {
    if (c.deletedAt && c.deletedAt < cutoff) {
      await hardDeleteCourse(c.id);
      n++;
    }
  }
  return n;
}
