import { create } from "xmlbuilder2";
import type { Course, Sequential } from "../schema";

// XBlock types that must be declared in advanced_modules to avoid orphan errors
const ADVANCED_MODULE_MAP: Record<string, string> = {
  lti: "lti_consumer",
  discussion: "discussion",
  poll: "poll",
  ora: "openassessment",
  library_content: "library_content",
};

function collectAdvancedModules(c: Course): string[] {
  const needed = new Set<string>();
  for (const ch of c.chapters)
    for (const seq of ch.sequentials)
      for (const v of seq.verticals)
        for (const b of v.blocks) {
          const mod = ADVANCED_MODULE_MAP[b.type];
          if (mod) needed.add(mod);
        }
  return [...needed].sort();
}

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
  const advancedModules = collectAdvancedModules(c);
  const attrs: Record<string, string> = {
    advanced_modules: JSON.stringify(advancedModules),
    display_name: c.course.displayName,
    language: c.course.language,
    self_paced: c.course.selfPaced ? "true" : "false",
    start: JSON.stringify(c.course.start),
  };
  if (c.course.end) attrs.end = JSON.stringify(c.course.end);
  if (c.course.enrollmentStart) attrs.enrollment_start = JSON.stringify(c.course.enrollmentStart);
  if (c.course.enrollmentEnd) attrs.enrollment_end = JSON.stringify(c.course.enrollmentEnd);
  if (c.course.invitationOnly) attrs.invitation_only = "true";
  if (c.course.catalogVisibility !== "both") attrs.catalog_visibility = c.course.catalogVisibility;

  const root = create({ version: "1.0" }).ele("course", attrs);
  for (const id of chapterIds) root.ele("chapter", { url_name: id });
  root.ele("wiki", { slug: `${c.course.org}.${c.course.courseCode}.${c.course.run}` });
  return root.end({ prettyPrint: true, headless: true });
}

export function buildPolicyJson(c: Course): string {
  const key = `course/${c.course.run}`;
  const advancedModules = collectAdvancedModules(c);
  const policy = {
    [key]: {
      advanced_modules: advancedModules,
      display_name: c.course.displayName,
      language: c.course.language,
      self_paced: c.course.selfPaced,
      start: c.course.start,
      ...(c.course.end ? { end: c.course.end } : {}),
      ...(c.course.enrollmentStart ? { enrollment_start: c.course.enrollmentStart } : {}),
      ...(c.course.enrollmentEnd ? { enrollment_end: c.course.enrollmentEnd } : {}),
      ...(c.course.invitationOnly ? { invitation_only: true } : {}),
      ...(c.course.catalogVisibility !== "both" ? { catalog_visibility: c.course.catalogVisibility } : {}),
      ...(c.about.courseImageName ? { course_image: c.about.courseImageName } : {}),
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

export function buildSequentialXml(seq: Sequential, verticalIds: string[]): string {
  const attrs: Record<string, string> = { display_name: seq.displayName };
  if (seq.format) {
    attrs.format = seq.format;
    attrs.graded = "true";
  }
  if (seq.start) attrs.start = seq.start;
  if (seq.due) attrs.due = seq.due;
  if (seq.showCorrectness) attrs.show_correctness = seq.showCorrectness;
  const root = create({ version: "1.0" }).ele("sequential", attrs);
  for (const id of verticalIds) root.ele("vertical", { url_name: id });
  return root.end({ prettyPrint: true, headless: true });
}

// Map schema type → OLX element name
const OLX_ELEMENT: Record<string, string> = {
  html: "html",
  problem: "problem",
  video: "video",
  discussion: "discussion",
  lti: "lti_consumer",
  poll: "poll",
  ora: "openassessment",
  library_content: "library_content",
};

export function buildVerticalXml(
  displayName: string,
  blocks: { type: string; id: string }[],
): string {
  const root = create({ version: "1.0" }).ele("vertical", { display_name: displayName });
  for (const b of blocks) root.ele(OLX_ELEMENT[b.type] ?? b.type, { url_name: b.id });
  return root.end({ prettyPrint: true, headless: true });
}
