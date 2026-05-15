import type { Course } from "../schema";

export interface CourseRecord {
  id: string;                  // UUID v4 — primary key
  name: string;                // Cached display name for the library list
  course: Course;              // Full schema (single source of truth)
  createdAt: number;           // unix ms
  updatedAt: number;           // unix ms
  thumbnailDataUrl?: string;   // data:image/jpeg;base64 of course image (optional)
  // soft-delete trash bin (phase 5)
  deletedAt?: number;
}

export interface AssetRecord {
  courseId: string;
  fileName: string;
  file: File;
  addedAt: number;
}

export type MetaKey =
  | "currentCourseId"
  | "schemaVersion"
  | "migratedFromLocalStorage";

export interface MetaRecord<T = unknown> {
  key: MetaKey;
  value: T;
}
