"use client";

// Course domain service — UI calls this rather than touching the DB layer
// directly. Swap implementations (cloud backend, in-memory mock for tests)
// without changing call sites.

import type { Course } from "../schema";
import type { CourseRecord } from "../db/types";
import {
  listCourses, getCourse, createCourse, saveCourse, renameCourse,
  softDeleteCourse, restoreCourse, hardDeleteCourse, duplicateCourse, purgeOldTrash,
} from "../db/courses";
import {
  listAssets, getAsset, putAsset, deleteAsset, loadAssetsAsMap,
} from "../db/assets";
import { purgeOrphanCourseAssets, collectCourseAssetRefs } from "../db/gc";

export interface CourseService {
  // Course CRUD
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
  // Asset CRUD
  listAssets(courseId: string): Promise<{ fileName: string; file: File }[]>;
  getAsset(courseId: string, fileName: string): Promise<File | undefined>;
  putAsset(courseId: string, file: File, name: string): Promise<void>;
  deleteAsset(courseId: string, fileName: string): Promise<void>;
  loadAssetsAsMap(courseId: string): Promise<Map<string, File>>;
  // Garbage collection
  collectAssetRefs(course: Course): Set<string>;
  purgeOrphanAssets(courseId: string, course: Course): Promise<number>;
}

// Default IndexedDB-backed implementation
export const courseService: CourseService = {
  list: listCourses,
  get: getCourse,
  create: createCourse,
  save: saveCourse,
  rename: renameCourse,
  duplicate: duplicateCourse,
  softDelete: softDeleteCourse,
  restore: restoreCourse,
  hardDelete: hardDeleteCourse,
  purgeOldTrash,

  async listAssets(courseId) {
    const recs = await listAssets(courseId);
    return recs.map((r) => ({ fileName: r.fileName, file: r.file }));
  },
  async getAsset(courseId, fileName) {
    const rec = await getAsset(courseId, fileName);
    return rec?.file;
  },
  async putAsset(courseId, file, name) { await putAsset(courseId, file, name); },
  deleteAsset,
  loadAssetsAsMap,

  collectAssetRefs: collectCourseAssetRefs,
  purgeOrphanAssets: purgeOrphanCourseAssets,
};
