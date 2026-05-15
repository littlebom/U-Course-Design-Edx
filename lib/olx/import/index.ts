"use client";

import { type Course, courseSchema } from "../../schema";
import { type ParseXmlResult } from "../../xmlParse";
import { extractTar, getXml, attr } from "./tar";
import { cleanSumacFiles, validateSumacCompatibility, formatSumacIssues } from "./sumac";
import { parsePolicy, parseGrading, parseAbout } from "./parse-policy";
import { extractStaticAssets } from "./extract-assets";
import { walkChapters } from "./walk-course";

export type OlxParseResult = ParseXmlResult & { assets: Map<string, File> };

export async function parseOlxTar(buffer: ArrayBuffer): Promise<OlxParseResult> {
  const warnings: string[] = [];
  const files = await extractTar(buffer);

  // ── Auto-clean Sumac artifacts ────────────────────────────────────────────
  cleanSumacFiles(files, warnings);

  // ── Sumac compatibility check (after clean) ───────────────────────────────
  const sumacIssues = validateSumacCompatibility(files);
  warnings.push(...formatSumacIssues(sumacIssues));

  // ── Course entry point ────────────────────────────────────────────────────
  const coursePtr = getXml(files, "course/course.xml") ?? getXml(files, "course.xml");
  if (!coursePtr) throw new Error("ไม่พบ course/course.xml ในไฟล์ tar.gz");

  const run = attr(coursePtr, "url_name") || "run";
  const courseEl = getXml(files, `course/${run}.xml`);
  if (!courseEl) throw new Error(`ไม่พบ course/${run}.xml`);

  const org = attr(coursePtr, "org") || attr(courseEl, "org") || "ORG";
  const courseCode = attr(coursePtr, "course") || attr(courseEl, "course") || "COURSE";
  const displayName = attr(courseEl, "display_name") || attr(courseEl, "displayName") || "Course";
  const language = attr(courseEl, "language") || "th";
  const start = attr(courseEl, "start") || "2026-01-01T00:00:00Z";

  // ── Policy / about / grading ──────────────────────────────────────────────
  const policy = parsePolicy(files, run);
  const about = parseAbout(files);
  const { cutoffs, graders } = parseGrading(files, run, warnings);

  // ── Static assets (images + transcripts) ──────────────────────────────────
  const { assets, courseImageName } = extractStaticAssets(files, policy.courseImageName);

  // ── Walk chapters → sequentials → verticals → blocks ──────────────────────
  const chapters = walkChapters(courseEl, files, warnings);
  if (chapters.length === 0) {
    throw new Error("ไม่พบเนื้อหาในไฟล์ OLX กรุณาตรวจสอบโครงสร้าง tar.gz");
  }

  const raw = {
    course: {
      org, courseCode, run, displayName, language, start,
      selfPaced: policy.selfPaced,
      ...(policy.end ? { end: policy.end } : {}),
      ...(policy.enrollmentStart ? { enrollmentStart: policy.enrollmentStart } : {}),
      ...(policy.enrollmentEnd ? { enrollmentEnd: policy.enrollmentEnd } : {}),
      ...(policy.invitationOnly ? { invitationOnly: policy.invitationOnly } : {}),
      catalogVisibility: policy.catalogVisibility,
    },
    about: { ...about, courseImageName },
    grading: { cutoffs, graders },
    chapters,
  };

  const result = courseSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      warnings.push(`Schema: ${issue.message} (${issue.path.join(" › ")})`);
    }
    throw new Error(`Schema ไม่ถูกต้อง: ${result.error.issues[0]?.message ?? "unknown"}`);
  }

  return { course: result.data as Course, warnings, assets };
}
