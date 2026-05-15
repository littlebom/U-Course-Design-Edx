"use client";

import type { TarEntry } from "./tar";

const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|svg)$/i;
const TRANSCRIPT_EXTS = /\.(srt|sjson|vtt)$/i;
const STATIC_PATHS = ["static/", "about/"];

const IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
};

// Extract static assets (images + SRT/VTT transcripts) into a File map.
// Returns the (possibly updated) courseImageName — if the policy didn't set one
// but about/image.* exists, we use that file name.
export function extractStaticAssets(
  files: Map<string, TarEntry>,
  initialCourseImage: string,
): { assets: Map<string, File>; courseImageName: string } {
  const assets = new Map<string, File>();
  let courseImageName = initialCourseImage;

  for (const [path, entry] of files) {
    if (!STATIC_PATHS.some((p) => path.startsWith(p))) continue;
    const fileName = path.split("/").pop()!;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const buf = new Uint8Array(entry.binary).buffer as ArrayBuffer;

    if (IMAGE_EXTS.test(path)) {
      const mime = IMAGE_MIME[ext] ?? "image/jpeg";
      assets.set(fileName, new File([buf], fileName, { type: mime }));
      if (!courseImageName && path.includes("about/image")) courseImageName = fileName;
    } else if (TRANSCRIPT_EXTS.test(path)) {
      const mime = ext === "srt" ? "text/plain" : ext === "vtt" ? "text/vtt" : "application/json";
      assets.set(fileName, new File([buf], fileName, { type: mime }));
    }
  }

  return { assets, courseImageName };
}
