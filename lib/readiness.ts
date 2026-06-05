import type { Course, Block } from "./schema";
import { validateCourse } from "./validate";

// ── Ulmo readiness model ────────────────────────────────────────────────
// A pre-export checker: does this Course look ready to import into Open edX
// Ulmo (release 21, Jan 2026)? Combines compatibility checks (things that block
// or break the import) with course-quality best practices, and produces a score.
//
// NOTE: This catches a lot up-front but does NOT replace a real import test into
// an Ulmo Studio/LMS instance.

export type ReadinessSeverity = "fail" | "warn" | "info"; // severity when a check fails
export type ReadinessCategory = "compat" | "quality";

export interface ReadinessCheck {
  id: string;
  category: ReadinessCategory;
  title: string;
  passed: boolean;
  severity: ReadinessSeverity;
  weight: number;
  detail: string;
  items?: string[]; // offending breadcrumbs / refs
}

export interface ReadinessReport {
  checks: ReadinessCheck[];
  score: number; // 0–100
  status: "ready" | "almost" | "not-ready";
  summary: { fail: number; warn: number; info: number; pass: number };
}

// Patterns deprecated / incompatible in Ulmo (mirrors lib/olx/import/sumac.ts).
const LIBRARY_V1_RE = /library-v1:/;
const SUMAC_ARTIFACT_RES: { re: RegExp; label: string }[] = [
  { re: /upstream="/, label: 'upstream="…"' },
  { re: /x-is-pointer-node/, label: "x-is-pointer-node" },
  { re: /copied_from_block/, label: "copied_from_block" },
];
// Studio course-key segment constraint.
const KEY_SEGMENT_RE = /^[A-Za-z0-9_.\-]+$/;

// Return the raw OLX/string payload of a block we can scan for stray patterns.
function blockText(b: Block): string {
  switch (b.type) {
    case "html":
      return b.html;
    case "ora":
    case "library_content":
    case "unknown":
      return b.rawXml;
    default:
      return "";
  }
}

interface WalkCtx {
  blocks: { where: string; block: Block }[];
  hasProblem: boolean;
  formats: { where: string; format: string }[];
}

function walk(course: Course): WalkCtx {
  const ctx: WalkCtx = { blocks: [], hasProblem: false, formats: [] };
  for (const ch of course.chapters) {
    for (const seq of ch.sequentials) {
      if (seq.format && seq.format.trim())
        ctx.formats.push({ where: `${ch.displayName} › ${seq.displayName}`, format: seq.format.trim() });
      for (const v of seq.verticals) {
        for (const b of v.blocks) {
          const where = `${ch.displayName} › ${seq.displayName} › ${v.displayName} › ${b.displayName}`;
          ctx.blocks.push({ where, block: b });
          if (b.type === "problem") ctx.hasProblem = true;
        }
      }
    }
  }
  return ctx;
}

function isValidDate(s: string | undefined): boolean {
  if (!s || !s.trim()) return true; // optional & blank = ok
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

function ts(s: string | undefined): number | null {
  if (!s || !s.trim()) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export function checkUlmoReadiness(course: Course, assetNames: Set<string>): ReadinessReport {
  const ctx = walk(course);
  const checks: ReadinessCheck[] = [];
  const add = (c: ReadinessCheck) => checks.push(c);

  // ── Compat ──────────────────────────────────────────────────────────────

  // C1: existing structural/content validation must be error-free
  const issues = validateCourse(course, assetNames);
  const errors = issues.filter((i) => i.level === "error");
  add({
    id: "content-valid",
    category: "compat",
    title: "เนื้อหาผ่านการตรวจสอบ (export ได้)",
    passed: errors.length === 0,
    severity: "fail",
    weight: 3,
    detail:
      errors.length === 0
        ? "ไม่พบข้อผิดพลาดเชิงโครงสร้าง/เนื้อหา"
        : `พบ ${errors.length} ข้อผิดพลาดที่ต้องแก้ก่อน export (ดูการ์ด “ตรวจสอบ”)`,
    items: errors.map((e) => e.message),
  });

  // C2: no Library v1 references (deprecated in Ulmo)
  const v1 = ctx.blocks.filter(({ block }) => LIBRARY_V1_RE.test(blockText(block)));
  add({
    id: "no-library-v1",
    category: "compat",
    title: "ไม่มี reference ของ Library v1",
    passed: v1.length === 0,
    severity: "fail",
    weight: 3,
    detail:
      v1.length === 0
        ? "ไม่พบ library-v1: — ใช้ Content Library v2 ถูกต้อง"
        : "พบการอ้าง library-v1: ซึ่ง deprecated ใน Ulmo — ต้องแปลงเป็น Library v2",
    items: v1.map((b) => b.where),
  });

  // C3: course key segments present & well-formed
  const keyProblems: string[] = [];
  for (const [label, val] of [
    ["org", course.course.org],
    ["course code", course.course.courseCode],
    ["run", course.course.run],
  ] as const) {
    if (!val || !val.trim()) keyProblems.push(`${label} ว่าง`);
    else if (!KEY_SEGMENT_RE.test(val)) keyProblems.push(`${label} "${val}" มีอักขระไม่ถูกต้อง`);
  }
  add({
    id: "course-key-valid",
    category: "compat",
    title: "Course key (org/course/run) ถูกต้อง",
    passed: keyProblems.length === 0,
    severity: "fail",
    weight: 3,
    detail:
      keyProblems.length === 0
        ? `lib key: ${course.course.org}/${course.course.courseCode}/${course.course.run}`
        : "ต้องไม่ว่างและใช้ได้เฉพาะ A–Z a–z 0–9 _ . -",
    items: keyProblems,
  });

  // C4: no unknown block types (Ulmo may not have the XBlock installed)
  const unknown = ctx.blocks.filter(({ block }) => block.type === "unknown");
  add({
    id: "known-block-types",
    category: "compat",
    title: "ไม่มี block ชนิดที่ระบบไม่รู้จัก",
    passed: unknown.length === 0,
    severity: "warn",
    weight: 2,
    detail:
      unknown.length === 0
        ? "ทุก block เป็นชนิดที่รองรับ"
        : "พบ block ชนิด unknown — Ulmo อาจไม่มี XBlock ติดตั้งและจะ render ไม่ได้",
    items: unknown.map((b) => b.where),
  });

  // C5: no leftover Sumac Library-v2 artifacts
  const sumac: string[] = [];
  for (const { where, block } of ctx.blocks) {
    const text = blockText(block);
    if (!text) continue;
    const hits = SUMAC_ARTIFACT_RES.filter(({ re }) => re.test(text)).map((h) => h.label);
    if (hits.length) sumac.push(`${where} (${hits.join(", ")})`);
  }
  add({
    id: "no-sumac-artifacts",
    category: "compat",
    title: "ไม่มี Sumac Library-v2 artifacts",
    passed: sumac.length === 0,
    severity: "warn",
    weight: 2,
    detail:
      sumac.length === 0
        ? "ไม่พบ upstream / x-is-pointer-node / copied_from_block"
        : "พบ attribute ของ Sumac ที่ไม่ compatible กับ Ulmo",
    items: sumac,
  });

  // C6: LTI 1.3 completeness
  const ltiProblems: string[] = [];
  for (const { where, block } of ctx.blocks) {
    if (block.type !== "lti") continue;
    const url = block.launchUrl?.trim() ?? "";
    if (!/^https:\/\//i.test(url)) ltiProblems.push(`${where}: Launch URL ควรเป็น https`);
    if (block.keysetUrl?.trim() && !block.oidcUrl?.trim())
      ltiProblems.push(`${where}: มี keyset URL แต่ขาด OIDC URL`);
  }
  add({
    id: "lti-1p3-complete",
    category: "compat",
    title: "การตั้งค่า LTI 1.3 ครบถ้วน",
    passed: ltiProblems.length === 0,
    severity: "warn",
    weight: 2,
    detail: ltiProblems.length === 0 ? "ไม่มี LTI หรือ LTI ตั้งค่าครบ" : "ตรวจสอบ Launch/OIDC URL ของ LTI",
    items: ltiProblems,
  });

  // C7: dates parse & ordering
  const dateProblems: string[] = [];
  const { start, end, enrollmentStart, enrollmentEnd } = course.course;
  for (const [label, val] of [
    ["start", start],
    ["end", end],
    ["enrollment_start", enrollmentStart],
    ["enrollment_end", enrollmentEnd],
  ] as const) {
    if (!isValidDate(val)) dateProblems.push(`${label} ไม่ใช่วันที่ ISO 8601 ที่ถูกต้อง`);
  }
  const tStart = ts(start);
  const tEnd = ts(end);
  const tES = ts(enrollmentStart);
  const tEE = ts(enrollmentEnd);
  if (tStart != null && tEnd != null && tStart >= tEnd) dateProblems.push("start ต้องมาก่อน end");
  if (tES != null && tEE != null && tES >= tEE) dateProblems.push("enrollment_start ต้องมาก่อน enrollment_end");
  add({
    id: "dates-valid",
    category: "compat",
    title: "วันที่ถูกต้องและเรียงลำดับถูก",
    passed: dateProblems.length === 0,
    severity: "warn",
    weight: 1,
    detail: dateProblems.length === 0 ? "วันที่ทั้งหมดถูกต้อง" : "ตรวจสอบรูปแบบ/ลำดับวันที่",
    items: dateProblems,
  });

  // ── Quality ───────────────────────────────────────────────────────────────

  const graders = course.grading?.graders ?? [];

  // Q1: graded course should declare grading buckets
  add({
    id: "has-grading",
    category: "quality",
    title: "มีการกำหนดการให้คะแนน",
    passed: !ctx.hasProblem || graders.length > 0,
    severity: "info",
    weight: 1,
    detail:
      !ctx.hasProblem || graders.length > 0
        ? "มี grading หรือไม่มีแบบฝึกหัดที่ต้องให้คะแนน"
        : "คอร์สมีแบบฝึกหัดแต่ยังไม่ตั้งค่า grader (น้ำหนักคะแนน)",
  });

  // Q2: grader weights sum ≈ 1.0
  const weightSum = graders.reduce((s, g) => s + (g.weight ?? 0), 0);
  add({
    id: "grader-weights",
    category: "quality",
    title: "น้ำหนักคะแนนรวมเท่ากับ 100%",
    passed: graders.length === 0 || Math.abs(weightSum - 1) < 0.001,
    severity: "warn",
    weight: 1,
    detail:
      graders.length === 0
        ? "ไม่มี grader"
        : Math.abs(weightSum - 1) < 0.001
          ? "น้ำหนักรวม = 100%"
          : `น้ำหนักรวม = ${Math.round(weightSum * 100)}% (ควรเป็น 100%)`,
  });

  // Q3: every graded sequential.format must exist in graders
  const graderTypes = new Set(graders.map((g) => g.type));
  const badFormats = ctx.formats.filter((f) => !graderTypes.has(f.format));
  add({
    id: "graded-format-valid",
    category: "quality",
    title: "Assignment type ของ subsection ตรงกับ grader",
    passed: badFormats.length === 0,
    severity: "warn",
    weight: 1,
    detail:
      badFormats.length === 0
        ? "ทุก subsection ที่ให้คะแนนอ้าง grader ที่มีอยู่"
        : "บาง subsection อ้าง assignment type ที่ไม่มีใน grader",
    items: badFormats.map((f) => `${f.where} → "${f.format}"`),
  });

  // Q4: about completeness
  const about = course.about;
  const missingAbout: string[] = [];
  if (!about.shortDescription.trim()) missingAbout.push("คำอธิบายสั้น");
  if (!about.overview.trim()) missingAbout.push("ภาพรวมคอร์ส (overview)");
  if (!about.courseImageName.trim()) missingAbout.push("รูปปกคอร์ส");
  if (!course.course.language.trim()) missingAbout.push("ภาษา");
  add({
    id: "about-complete",
    category: "quality",
    title: "ข้อมูลหน้า About ครบถ้วน",
    passed: missingAbout.length === 0,
    severity: "info",
    weight: 1,
    detail: missingAbout.length === 0 ? "ข้อมูล About ครบ" : `ยังขาด: ${missingAbout.join(", ")}`,
    items: missingAbout,
  });

  // Q5: structure has no empty chapters/sequentials (reuse validate warnings)
  const emptyStructure = issues
    .filter((i) => i.message.includes("ไม่มี sequential") || i.message.includes("ไม่มี vertical"))
    .map((i) => i.message);
  add({
    id: "structure-filled",
    category: "quality",
    title: "โครงสร้างไม่มีส่วนที่ว่าง",
    passed: emptyStructure.length === 0,
    severity: "info",
    weight: 1,
    detail: emptyStructure.length === 0 ? "ทุกบท/หัวข้อมีเนื้อหา" : "มีบทหรือหัวข้อที่ยังว่าง",
    items: emptyStructure,
  });

  // ── Score & status ────────────────────────────────────────────────────────
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const score = totalWeight === 0 ? 100 : Math.round((earned / totalWeight) * 100);

  const summary = {
    fail: checks.filter((c) => !c.passed && c.severity === "fail").length,
    warn: checks.filter((c) => !c.passed && c.severity === "warn").length,
    info: checks.filter((c) => !c.passed && c.severity === "info").length,
    pass: checks.filter((c) => c.passed).length,
  };

  // A failing compat check blocks import → never "ready".
  const status: ReadinessReport["status"] =
    summary.fail > 0 ? "not-ready" : score >= 90 ? "ready" : "almost";

  return { checks, score, status, summary };
}
