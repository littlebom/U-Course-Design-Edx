import type { Course } from "../schema";
import {
  buildChapterXml,
  buildGradingPolicyJson,
  buildPolicyJson,
  buildRootCourseXml,
  buildRunCourseXml,
  buildSequentialXml,
  buildVerticalXml,
} from "./course-xml";
import { buildHtmlBlock } from "./block-html";
import { buildProblemBlock } from "./block-problem";
import { buildVideoBlock } from "./block-video";
import { buildAboutFiles } from "./about";
import { urlName } from "./ids";
import type { FileEntry } from "./tar";

export type AssetMap = Map<string, Buffer>;

export function buildOlxFiles(
  course: Course,
  assets: AssetMap,
): { files: FileEntry[]; missingAssets: string[] } {
  const files: FileEntry[] = [];
  const allRefs = new Set<string>();
  const chapterIds: string[] = [];

  for (const ch of course.chapters) {
    const seqIds: string[] = [];
    for (const seq of ch.sequentials) {
      const vertIds: string[] = [];
      for (const v of seq.verticals) {
        const blockRefs: { type: "html" | "problem" | "video"; id: string }[] = [];
        for (const b of v.blocks) {
          const id = urlName();
          if (b.type === "html") {
            const { pointerXml, htmlContent, assetRefs } = buildHtmlBlock(b, id);
            files.push({ path: `course/html/${id}.xml`, data: pointerXml });
            files.push({ path: `course/html/${id}.html`, data: htmlContent });
            assetRefs.forEach((r) => allRefs.add(r));
            blockRefs.push({ type: "html", id });
          } else if (b.type === "video") {
            files.push({ path: `course/video/${id}.xml`, data: buildVideoBlock(b, id) });
            blockRefs.push({ type: "video", id });
          } else {
            files.push({ path: `course/problem/${id}.xml`, data: buildProblemBlock(b) });
            blockRefs.push({ type: "problem", id });
          }
        }
        const vid = urlName();
        files.push({
          path: `course/vertical/${vid}.xml`,
          data: buildVerticalXml(v.displayName, blockRefs),
        });
        vertIds.push(vid);
      }
      const sid = urlName();
      files.push({
        path: `course/sequential/${sid}.xml`,
        data: buildSequentialXml(seq.displayName, vertIds, seq.format),
      });
      seqIds.push(sid);
    }
    const cid = urlName();
    files.push({
      path: `course/chapter/${cid}.xml`,
      data: buildChapterXml(ch.displayName, seqIds),
    });
    chapterIds.push(cid);
  }

  files.push({ path: "course/course.xml", data: buildRootCourseXml(course) });
  files.push({
    path: `course/course/${course.course.run}.xml`,
    data: buildRunCourseXml(course, chapterIds),
  });
  files.push({
    path: `course/policies/${course.course.run}/policy.json`,
    data: buildPolicyJson(course),
  });
  files.push({
    path: `course/policies/${course.course.run}/grading_policy.json`,
    data: buildGradingPolicyJson(course),
  });
  files.push({ path: "course/assets/assets.xml", data: "<assets/>\n" });
  files.push(...buildAboutFiles(course));

  const missingAssets: string[] = [];
  for (const ref of allRefs) {
    const buf = assets.get(ref);
    if (!buf) {
      missingAssets.push(ref);
      continue;
    }
    files.push({ path: `course/static/${ref}`, data: buf });
  }

  return { files, missingAssets };
}
