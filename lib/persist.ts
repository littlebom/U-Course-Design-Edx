import type { Course } from "./schema";
import { courseSchema } from "./schema";

const KEY = "u-coursebuilder:course:v1";

export function loadFromStorage(): Course | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = courseSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveToStorage(course: Course): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(course));
  } catch {
    /* quota exceeded — ignore silently */
  }
}

export function clearStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

import { downloadJson } from "./download";

export function downloadCourseJson(course: Course): void {
  downloadJson(course, `${course.course.courseCode}-${course.course.run}.json`);
}
