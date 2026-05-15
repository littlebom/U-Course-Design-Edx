"use client";

import type { TarEntry } from "./tar";

export interface CoursePolicy {
  courseImageName: string;
  selfPaced: boolean;
  end?: string;
  enrollmentStart?: string;
  enrollmentEnd?: string;
  invitationOnly: boolean;
  catalogVisibility: "both" | "about" | "none";
}

export function parsePolicy(files: Map<string, TarEntry>, run: string): CoursePolicy {
  const out: CoursePolicy = {
    courseImageName: "",
    selfPaced: true,
    invitationOnly: false,
    catalogVisibility: "both",
  };
  const text = files.get(`policies/${run}/policy.json`)?.text;
  if (!text) return out;
  try {
    const policy = JSON.parse(text);
    const key = Object.keys(policy).find((k) => k.startsWith("course/"));
    const cp = key ? policy[key] : null;
    if (!cp) return out;
    if (cp.course_image) out.courseImageName = cp.course_image as string;
    if (cp.self_paced !== undefined) out.selfPaced = !!cp.self_paced;
    if (cp.end && cp.end !== "null") out.end = String(cp.end);
    if (cp.enrollment_start && cp.enrollment_start !== "null") out.enrollmentStart = String(cp.enrollment_start);
    if (cp.enrollment_end && cp.enrollment_end !== "null") out.enrollmentEnd = String(cp.enrollment_end);
    if (cp.invitation_only) out.invitationOnly = !!cp.invitation_only;
    if (cp.catalog_visibility && ["both", "about", "none"].includes(cp.catalog_visibility)) {
      out.catalogVisibility = cp.catalog_visibility as "both" | "about" | "none";
    }
  } catch { /* ignore */ }
  return out;
}

export interface CourseGrading {
  cutoffs: Record<string, number>;
  graders: object[];
}

export function parseGrading(files: Map<string, TarEntry>, run: string, warnings: string[]): CourseGrading {
  let cutoffs: Record<string, number> = { Pass: 0.5 };
  let graders: object[] = [];
  const text = files.get(`policies/${run}/grading_policy.json`)?.text;
  if (!text) return { cutoffs, graders };
  try {
    const gp = JSON.parse(text);
    if (gp.GRADE_CUTOFFS) {
      cutoffs = Object.fromEntries(
        Object.entries(gp.GRADE_CUTOFFS).map(([k, v]) => [k, Number(v)]),
      );
    }
    if (Array.isArray(gp.GRADER)) {
      graders = gp.GRADER.map((g: Record<string, unknown>) => ({
        type: String(g.type ?? "Homework"),
        shortLabel: String(g.short_label ?? g.shortLabel ?? "HW"),
        minCount: Number(g.min_count ?? g.minCount ?? 1),
        dropCount: Number(g.drop_count ?? g.dropCount ?? 0),
        weight: Number(g.weight ?? 0),
      }));
    }
  } catch {
    warnings.push("ไม่สามารถอ่าน grading_policy.json — ใช้ค่าเริ่มต้น");
  }
  return { cutoffs, graders };
}

export interface CourseAbout {
  overview: string;
  shortDescription: string;
  effort: string;
  duration: string;
  subtitle: string;
  introVideoYoutubeId: string;
}

export function parseAbout(files: Map<string, TarEntry>): CourseAbout {
  const read = (name: string) => (files.get(`about/${name}`)?.text ?? "").trim();
  const videoHtml = read("video.html");
  const ytMatch =
    videoHtml.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    videoHtml.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    videoHtml.match(/([A-Za-z0-9_-]{11})/);
  return {
    overview: read("overview.html"),
    shortDescription: read("short_description.html"),
    effort: read("effort.html"),
    duration: read("duration.html"),
    subtitle: read("subtitle.html"),
    introVideoYoutubeId: ytMatch ? ytMatch[1] : "",
  };
}
