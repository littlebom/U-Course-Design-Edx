import type { Course } from "./schema";
import { courseSchema } from "./schema";

type FileSystemFileHandle = {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string | Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

declare global {
  interface Window {
    showOpenFilePicker?: (opts?: {
      types?: { description?: string; accept: Record<string, string[]> }[];
      multiple?: boolean;
    }) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (opts?: {
      suggestedName?: string;
      types?: { description?: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
  }
}

export const supportsFileSystemAccess = (): boolean =>
  typeof window !== "undefined" && typeof window.showOpenFilePicker === "function";

const JSON_TYPE = {
  description: "JSON file",
  accept: { "application/json": [".json"] },
};

export async function openCourseFile(): Promise<{
  course: Course | null;
  handle: FileSystemFileHandle;
} | null> {
  if (!window.showOpenFilePicker) return null;
  const [handle] = await window.showOpenFilePicker({ types: [JSON_TYPE], multiple: false });
  const file = await handle.getFile();
  const text = (await file.text()).trim();
  if (!text) return { course: null, handle };
  const parsed = JSON.parse(text);
  const result = courseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Schema ไม่ถูกต้อง: ${result.error.issues[0]?.message ?? "unknown"}`);
  }
  return { course: result.data, handle };
}

export async function saveAsCourseFile(course: Course): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) return null;
  const handle = await window.showSaveFilePicker({
    suggestedName: `${course.course.courseCode}-${course.course.run}.json`,
    types: [JSON_TYPE],
  });
  await writeHandle(handle, course);
  return handle;
}

export async function writeHandle(handle: FileSystemFileHandle, course: Course): Promise<void> {
  const w = await handle.createWritable();
  await w.write(JSON.stringify(course, null, 2));
  await w.close();
}
