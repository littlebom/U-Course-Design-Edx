"use client";

import type { Block, Course } from "../schema";
import { videoStaticRefs } from "../olx/block-video";
import { listAssets, deleteAsset } from "./assets";

const ASSET_RE = /asset:\/\/([A-Za-z0-9_.\-/]+)/g;

// Collect every asset filename referenced anywhere in a course — image refs
// in HTML blocks, SRT files in video blocks, and the course thumbnail.
export function collectCourseAssetRefs(course: Course): Set<string> {
  const refs = new Set<string>();

  // Course image (thumbnail) — may be a plain filename or an asset-v1: URL.
  // We only treat plain filenames as managed-by-us references.
  const thumb = course.about.courseImageName;
  if (thumb && !thumb.startsWith("asset-v1:") && !thumb.startsWith("/asset-v1:")) {
    refs.add(thumb);
  }

  const walk = (block: Block) => {
    switch (block.type) {
      case "html": {
        for (const m of block.html.matchAll(ASSET_RE)) refs.add(m[1]);
        break;
      }
      case "video": {
        for (const srt of videoStaticRefs(block)) refs.add(srt);
        break;
      }
      default:
        return;
    }
  };

  for (const ch of course.chapters)
    for (const seq of ch.sequentials)
      for (const v of seq.verticals)
        for (const b of v.blocks) walk(b);

  return refs;
}

// Remove DB asset rows for this course that no block in `course` references.
// Returns the number of deleted assets so the UI can report it.
export async function purgeOrphanCourseAssets(
  courseId: string,
  course: Course,
): Promise<number> {
  const referenced = collectCourseAssetRefs(course);
  const stored = await listAssets(courseId);
  let purged = 0;
  for (const rec of stored) {
    if (!referenced.has(rec.fileName)) {
      await deleteAsset(courseId, rec.fileName);
      purged++;
    }
  }
  return purged;
}
