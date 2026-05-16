"use client";

// Single entry point for UI code: import from "@/lib/domain" rather than
// digging into "@/lib/db/*". Makes future cloud-sync swap or test-mock
// substitution a one-file change.
export { courseService } from "./course";
export type { CourseService } from "./course";
export { libraryService } from "./library";
export type { LibraryService } from "./library";
