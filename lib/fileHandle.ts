import type { Course } from "./schema";
import { parseXmlCourse } from "./xmlParse";

export type FileSystemFileHandle = {
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

const XML_TYPE = {
  description: "XML file",
  accept: { "application/xml": [".xml"], "text/xml": [".xml"] },
};

export async function openCourseFile(): Promise<{
  course: Course | null;
  handle: FileSystemFileHandle;
} | null> {
  if (!window.showOpenFilePicker) return null;
  const [handle] = await window.showOpenFilePicker({ types: [XML_TYPE], multiple: false });
  const file = await handle.getFile();
  const text = (await file.text()).trim();
  if (!text) return { course: null, handle };
  const { course } = parseXmlCourse(text);
  return { course, handle };
}

export async function saveAsCourseFile(course: Course): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) return null;
  const handle = await window.showSaveFilePicker({
    suggestedName: `${course.course.courseCode}-${course.course.run}.json`,
    types: [{ description: "JSON file", accept: { "application/json": [".json"] } }],
  });
  await writeHandle(handle, course);
  return handle;
}

export async function writeHandle(handle: FileSystemFileHandle, course: Course): Promise<void> {
  const w = await handle.createWritable();
  await w.write(JSON.stringify(course, null, 2));
  await w.close();
}
