"use client";

import type { Course } from "../schema";
import { courseSchema } from "../schema";
import { createCourse, listCourses } from "./courses";
import { listAssets, putAsset } from "./assets";
import { downloadBlob } from "../download";

interface AssetBackup {
  fileName: string;
  type: string;
  size: number;
  dataB64: string;
}

interface CourseBackup {
  id: string;
  name: string;
  course: Course;
  createdAt: number;
  updatedAt: number;
  assets: AssetBackup[];
}

interface BackupFile {
  version: 1;
  exportedAt: number;
  courses: CourseBackup[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

// Export every course + every asset into a single JSON file the user can save.
export async function exportAllAsJson(): Promise<Blob> {
  const courses = await listCourses(false);
  const out: BackupFile = { version: 1, exportedAt: Date.now(), courses: [] };
  for (const c of courses) {
    const assets = await listAssets(c.id);
    const assetBackups: AssetBackup[] = [];
    for (const a of assets) {
      const dataB64 = await blobToBase64(a.file);
      assetBackups.push({ fileName: a.fileName, type: a.file.type, size: a.file.size, dataB64 });
    }
    out.courses.push({
      id: c.id, name: c.name, course: c.course,
      createdAt: c.createdAt, updatedAt: c.updatedAt, assets: assetBackups,
    });
  }
  return new Blob([JSON.stringify(out)], { type: "application/json" });
}

export async function downloadBackup(): Promise<void> {
  const blob = await exportAllAsJson();
  downloadBlob(blob, `olx-builder-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

// Restore courses + assets. Always creates new IDs to avoid clobbering existing courses.
export async function importBackup(file: File): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const text = await file.text();
  const parsed = JSON.parse(text) as BackupFile;
  if (parsed.version !== 1) throw new Error(`เวอร์ชัน backup ไม่รองรับ: ${parsed.version}`);
  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const cb of parsed.courses) {
    try {
      const valid = courseSchema.safeParse(cb.course);
      if (!valid.success) {
        skipped++;
        errors.push(`${cb.name}: schema ไม่ถูกต้อง`);
        continue;
      }
      const rec = await createCourse(valid.data, cb.name);
      for (const a of cb.assets) {
        const blob = base64ToBlob(a.dataB64, a.type);
        const file = new File([blob], a.fileName, { type: a.type });
        await putAsset(rec.id, file, a.fileName);
      }
      imported++;
    } catch (e) {
      skipped++;
      errors.push(`${cb.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { imported, skipped, errors };
}
