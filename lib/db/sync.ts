"use client";

// ─── Cloud Sync Interface (Phase 6 placeholder) ──────────────────────────
//
// This file defines the abstract contract that any future cloud-sync provider
// (Supabase, Firebase, a custom REST API, …) must implement. No provider is
// wired up yet — the local IndexedDB layer continues to be the source of truth.
//
// To enable cloud sync later:
//   1. Pick a provider, sign up, and configure auth.
//   2. Create lib/db/sync-providers/<provider>.ts implementing CloudSyncProvider.
//   3. Wire it via setSyncProvider() at app boot.
//   4. Add a sync indicator + manual-sync button in /courses UI.
//
// Conflict resolution: last-write-wins on updatedAt. For finer control we'll
// later store a per-course revision counter and prompt the user on conflict.

import type { Course } from "../schema";

export interface RemoteCourseRecord {
  id: string;
  name: string;
  course: Course;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  revision: number;          // incremented by server on every write
}

export interface RemoteAsset {
  courseId: string;
  fileName: string;
  url: string;               // signed URL or CDN URL
  size: number;
  type: string;
  uploadedAt: number;
}

export interface CloudSyncProvider {
  name: string;

  // Auth — implementation specific (OAuth flow, magic link, …)
  isSignedIn(): Promise<boolean>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;

  // Course CRUD
  listCourses(): Promise<RemoteCourseRecord[]>;
  pullCourse(id: string): Promise<RemoteCourseRecord | null>;
  pushCourse(rec: RemoteCourseRecord): Promise<RemoteCourseRecord>;
  deleteCourse(id: string): Promise<void>;

  // Asset CRUD
  listAssets(courseId: string): Promise<RemoteAsset[]>;
  uploadAsset(courseId: string, file: File): Promise<RemoteAsset>;
  downloadAsset(asset: RemoteAsset): Promise<File>;
  deleteAsset(courseId: string, fileName: string): Promise<void>;
}

// ─── Provider registry (stubs only) ──────────────────────────────────────

let activeProvider: CloudSyncProvider | null = null;

export function setSyncProvider(p: CloudSyncProvider | null) {
  activeProvider = p;
}

export function getSyncProvider(): CloudSyncProvider | null {
  return activeProvider;
}

export function isCloudSyncEnabled(): boolean {
  return activeProvider !== null;
}
