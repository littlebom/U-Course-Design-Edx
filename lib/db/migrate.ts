"use client";

import { courseSchema } from "../schema";
import { createCourse } from "./courses";
import { getMeta, setMeta } from "./index";

const LEGACY_KEY = "olx-builder:course:v1";

// One-time migration: if the user had a single course in localStorage from the
// pre-multi-course release, import it into the DB as their first course.
export async function migrateLegacyLocalStorage(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const already = await getMeta<boolean>("migratedFromLocalStorage");
  if (already) return null;

  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    await setMeta("migratedFromLocalStorage", true);
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const result = courseSchema.safeParse(parsed);
    if (!result.success) {
      await setMeta("migratedFromLocalStorage", true);
      return null;
    }
    const rec = await createCourse(result.data);
    await setMeta("migratedFromLocalStorage", true);
    // Keep the legacy entry around for one release as a safety net.
    return rec.id;
  } catch {
    await setMeta("migratedFromLocalStorage", true);
    return null;
  }
}
