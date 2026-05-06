import { create } from "xmlbuilder2";
import type { Course } from "../schema";

export function buildRootCourseXml(c: Course): string {
  return create({ version: "1.0" })
    .ele("course", {
      url_name: c.course.run,
      org: c.course.org,
      course: c.course.courseCode,
    })
    .end({ prettyPrint: false, headless: true });
}

export function buildRunCourseXml(c: Course, chapterIds: string[]): string {
  const root = create({ version: "1.0" }).ele("course", {
    advanced_modules: "[]",
    display_name: c.course.displayName,
    language: c.course.language,
    self_paced: c.course.selfPaced ? "true" : "false",
    start: JSON.stringify(c.course.start),
  });
  for (const id of chapterIds) root.ele("chapter", { url_name: id });
  root.ele("wiki", { slug: `${c.course.org}.${c.course.courseCode}.${c.course.run}` });
  return root.end({ prettyPrint: true, headless: true });
}

export function buildPolicyJson(c: Course): string {
  const key = `course/${c.course.run}`;
  const policy = {
    [key]: {
      advanced_modules: [],
      display_name: c.course.displayName,
      language: c.course.language,
      self_paced: c.course.selfPaced,
      start: c.course.start,
      tabs: [
        { type: "course_info", name: "Home" },
        { type: "courseware", name: "Courseware" },
        { type: "discussion", name: "Discussion" },
        { type: "wiki", name: "Wiki" },
        { type: "progress", name: "Progress" },
      ],
      discussion_topics: { General: { id: "course" } },
    },
  };
  return JSON.stringify(policy, null, 4);
}

export function buildGradingPolicyJson(c: Course): string {
  return JSON.stringify(
    {
      GRADER: c.grading.graders.map((g) => ({
        type: g.type,
        short_label: g.shortLabel,
        min_count: g.minCount,
        drop_count: g.dropCount,
        weight: g.weight,
      })),
      GRADE_CUTOFFS: c.grading.cutoffs,
    },
    null,
    4,
  );
}

export function buildChapterXml(displayName: string, sequentialIds: string[]): string {
  const root = create({ version: "1.0" }).ele("chapter", { display_name: displayName });
  for (const id of sequentialIds) root.ele("sequential", { url_name: id });
  return root.end({ prettyPrint: true, headless: true });
}

export function buildSequentialXml(
  displayName: string,
  verticalIds: string[],
  format?: string,
): string {
  const attrs: Record<string, string> = { display_name: displayName };
  if (format) {
    attrs.format = format;
    attrs.graded = "true";
  }
  const root = create({ version: "1.0" }).ele("sequential", attrs);
  for (const id of verticalIds) root.ele("vertical", { url_name: id });
  return root.end({ prettyPrint: true, headless: true });
}

export function buildVerticalXml(
  displayName: string,
  blocks: { type: "html" | "problem" | "video"; id: string }[],
): string {
  const root = create({ version: "1.0" }).ele("vertical", { display_name: displayName });
  for (const b of blocks) root.ele(b.type, { url_name: b.id });
  return root.end({ prettyPrint: true, headless: true });
}
