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
import { buildVideoBlock, videoStaticRefs } from "./block-video";
import { buildDiscussionBlock } from "./block-discussion";
import { buildLtiBlock } from "./block-lti";
import { buildPollBlock } from "./block-poll";
import { buildOraBlockFile } from "./block-ora";
import { buildLibraryContentBlockFile } from "./block-library-content";
import { buildUnknownBlockFile } from "./block-unknown";
import { buildAboutFiles } from "./about";
import { urlName } from "./ids";
import type { FileEntry } from "./tar";

export type AssetMap = Map<string, Buffer>;

type BlockRef = {
  type: "html" | "problem" | "video" | "discussion" | "lti" | "poll" | "ora" | "library_content" | string;
  id: string;
};

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
        const blockRefs: BlockRef[] = [];
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
            // SRT transcript files
            for (const srt of videoStaticRefs(b)) allRefs.add(srt);
            blockRefs.push({ type: "video", id });
          } else if (b.type === "discussion") {
            files.push({ path: `course/discussion/${id}.xml`, data: buildDiscussionBlock(b, id) });
            blockRefs.push({ type: "discussion", id });
          } else if (b.type === "lti") {
            files.push({ path: `course/lti_consumer/${id}.xml`, data: buildLtiBlock(b, id) });
            blockRefs.push({ type: "lti", id });
          } else if (b.type === "poll") {
            files.push({ path: `course/poll/${id}.xml`, data: buildPollBlock(b, id) });
            blockRefs.push({ type: "poll", id });
          } else if (b.type === "ora") {
            files.push({ path: `course/openassessment/${id}.xml`, data: buildOraBlockFile(b, id) });
            blockRefs.push({ type: "ora", id });
          } else if (b.type === "library_content") {
            files.push({ path: `course/library_content/${id}.xml`, data: buildLibraryContentBlockFile(b, id) });
            blockRefs.push({ type: "library_content", id });
          } else if (b.type === "unknown") {
            files.push({ path: `course/${b.blockType}/${id}.xml`, data: buildUnknownBlockFile(b, id) });
            blockRefs.push({ type: b.blockType, id });
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
        data: buildSequentialXml(seq, vertIds),
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

  const courseImageName = course.about.courseImageName;
  const isAssetUrl = courseImageName.startsWith("/asset-v1:") || courseImageName.startsWith("asset-v1:");
  if (courseImageName && !isAssetUrl) allRefs.add(courseImageName);

  const missingAssets: string[] = [];
  for (const ref of allRefs) {
    const buf = assets.get(ref);
    if (!buf) {
      missingAssets.push(ref);
      continue;
    }
    files.push({ path: `course/static/${ref}`, data: buf });
    if (ref === courseImageName) {
      files.push({ path: "course/about/image.jpg", data: buf });
    }
  }

  return { files, missingAssets };
}
