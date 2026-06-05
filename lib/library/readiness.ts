import type { ReadinessCheck, ReadinessReport } from "../readiness";
import { isContainer, isXBlock, type Library } from "./schema";
import type { Block } from "../schema";

// Ulmo readiness checker for a Content Library v2 — the library analogue of
// lib/readiness.ts (which targets a Course). Returns the SAME ReadinessReport
// shape so components/ReadinessPanel.tsx can render it unchanged.

const LIBRARY_KEY_RE = /^lib:[^:]+:[^:]+$/; // Ulmo requires lib:Org:Slug
const LIBRARY_V1_RE = /library-v1:/;
const SUMAC_ARTIFACT_RES: { re: RegExp; label: string }[] = [
  { re: /upstream="/, label: 'upstream="…"' },
  { re: /x-is-pointer-node/, label: "x-is-pointer-node" },
  { re: /copied_from_block/, label: "copied_from_block" },
];

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

// Compact mirror of the problem rules in lib/validate.ts — returns a reason
// string when the inner block is invalid, else null.
function problemIssue(b: Block): string | null {
  if (b.type !== "problem") return null;
  const kind = b.problemType;
  if (kind === "multiplechoice" || kind === "checkbox" || kind === "dropdown") {
    const choices = b.choices ?? [];
    if (choices.length < 2) return "ต้องมีตัวเลือกอย่างน้อย 2 ข้อ";
    const correct = choices.filter((c) => c.correct).length;
    if (correct === 0) return "ไม่มี choice ที่ถูก";
    if ((kind === "multiplechoice" || kind === "dropdown") && correct > 1)
      return `${kind} ต้องมีคำตอบถูกข้อเดียว`;
  } else if (kind === "numerical") {
    if (b.numericalAnswer == null || Number.isNaN(b.numericalAnswer))
      return "Numerical ต้องระบุคำตอบเป็นตัวเลข";
  } else if (kind === "text") {
    if ((b.textAnswers ?? []).filter((a) => a.trim()).length === 0)
      return "Text ต้องมีคำตอบที่ถูกอย่างน้อย 1 รายการ";
  }
  return null;
}

export function checkLibraryReadiness(library: Library): ReadinessReport {
  const checks: ReadinessCheck[] = [];
  const add = (c: ReadinessCheck) => checks.push(c);

  const entities = library.entities;
  const xblocks = entities.filter(isXBlock);
  const containers = entities.filter(isContainer);
  const validKeys = new Set(entities.map((e) => e.key));
  const titleOf = (key: string) => entities.find((e) => e.key === key)?.["title"] ?? key;

  // ── Compat ────────────────────────────────────────────────────────────────

  // C1: learning-package key format (lib:Org:Slug)
  add({
    id: "lib-key-valid",
    category: "compat",
    title: "Library key เป็นรูปแบบ lib:Org:Slug",
    passed: LIBRARY_KEY_RE.test(library.learningPackage.key),
    severity: "fail",
    weight: 3,
    detail: LIBRARY_KEY_RE.test(library.learningPackage.key)
      ? library.learningPackage.key
      : `"${library.learningPackage.key}" ไม่ตรงรูปแบบ lib:Org:Slug — Ulmo จะ reject`,
  });

  // C2: title present
  add({
    id: "lib-title",
    category: "compat",
    title: "Library มีชื่อ",
    passed: library.learningPackage.title.trim().length > 0,
    severity: "fail",
    weight: 2,
    detail: library.learningPackage.title.trim() ? "มีชื่อ Library" : "ชื่อ Library ว่าง",
  });

  // C3: unique entity keys (duplicates corrupt the zip)
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const e of entities) {
    if (seen.has(e.key)) dups.add(e.key);
    seen.add(e.key);
  }
  add({
    id: "unique-keys",
    category: "compat",
    title: "Entity key ไม่ซ้ำ",
    passed: dups.size === 0,
    severity: "fail",
    weight: 3,
    detail: dups.size === 0 ? "ทุก entity key ไม่ซ้ำกัน" : "พบ entity key ซ้ำ — Ulmo จะ reject",
    items: [...dups],
  });

  // C4: no dangling references (containers' children + collections' entities)
  const dangling: string[] = [];
  for (const c of containers)
    for (const child of c.children)
      if (!validKeys.has(child)) dangling.push(`Container "${c.title}" → ${child}`);
  for (const col of library.collections)
    for (const k of col.entities)
      if (!validKeys.has(k)) dangling.push(`Collection "${col.title}" → ${k}`);
  add({
    id: "no-dangling-refs",
    category: "compat",
    title: "ไม่มี reference ที่ชี้ entity ที่ไม่มีอยู่",
    passed: dangling.length === 0,
    severity: "warn",
    weight: 2,
    detail: dangling.length === 0 ? "reference ทั้งหมดถูกต้อง" : "มี reference ชี้ไป entity ที่ถูกลบ",
    items: dangling,
  });

  // C5: no Library v1 references
  const v1 = xblocks.filter((e) => LIBRARY_V1_RE.test(blockText(e.block))).map((e) => e.title);
  add({
    id: "no-library-v1",
    category: "compat",
    title: "ไม่มี reference ของ Library v1",
    passed: v1.length === 0,
    severity: "fail",
    weight: 3,
    detail: v1.length === 0 ? "ไม่พบ library-v1:" : "พบการอ้าง library-v1: ซึ่ง deprecated ใน Ulmo",
    items: v1,
  });

  // C6: no unknown block types
  const unknown = xblocks.filter((e) => e.block.type === "unknown").map((e) => e.title);
  add({
    id: "known-block-types",
    category: "compat",
    title: "ไม่มี block ชนิดที่ระบบไม่รู้จัก",
    passed: unknown.length === 0,
    severity: "warn",
    weight: 2,
    detail: unknown.length === 0 ? "ทุก block เป็นชนิดที่รองรับ" : "พบ block ชนิด unknown — Ulmo อาจ render ไม่ได้",
    items: unknown,
  });

  // C7: no Sumac artifacts
  const sumac: string[] = [];
  for (const e of xblocks) {
    const text = blockText(e.block);
    if (!text) continue;
    const hits = SUMAC_ARTIFACT_RES.filter(({ re }) => re.test(text)).map((h) => h.label);
    if (hits.length) sumac.push(`${e.title} (${hits.join(", ")})`);
  }
  add({
    id: "no-sumac-artifacts",
    category: "compat",
    title: "ไม่มี Sumac Library-v2 artifacts",
    passed: sumac.length === 0,
    severity: "warn",
    weight: 2,
    detail: sumac.length === 0 ? "ไม่พบ artifact ของ Sumac" : "พบ attribute ของ Sumac ที่ไม่ compatible",
    items: sumac,
  });

  // C8: inner block content valid
  const badContent: string[] = [];
  for (const e of xblocks) {
    const reason = problemIssue(e.block);
    if (reason) badContent.push(`${e.title}: ${reason}`);
  }
  add({
    id: "content-valid",
    category: "compat",
    title: "เนื้อหา block ถูกต้อง",
    passed: badContent.length === 0,
    severity: "fail",
    weight: 3,
    detail: badContent.length === 0 ? "ทุก block ผ่านการตรวจสอบ" : "มี block ที่เนื้อหาไม่ครบ/ผิดเงื่อนไข",
    items: badContent,
  });

  // ── Quality ─────────────────────────────────────────────────────────────────

  // Q1: has at least one entity
  add({
    id: "has-entities",
    category: "quality",
    title: "มีเนื้อหาใน Library",
    passed: entities.length > 0,
    severity: "info",
    weight: 1,
    detail: entities.length > 0 ? `มี ${entities.length} entity` : "ยังไม่มี entity ใน Library",
  });

  // Q2: containers not empty
  const emptyContainers = containers.filter((c) => c.children.length === 0).map((c) => c.title);
  add({
    id: "containers-filled",
    category: "quality",
    title: "ทุก container มีลูก",
    passed: emptyContainers.length === 0,
    severity: "info",
    weight: 1,
    detail: emptyContainers.length === 0 ? "ไม่มี container ว่าง" : "มี container ที่ยังไม่มีเนื้อหา",
    items: emptyContainers,
  });

  // Q3: collections not empty (only relevant when collections exist)
  const emptyCollections = library.collections.filter((c) => c.entities.length === 0).map((c) => c.title);
  add({
    id: "collections-filled",
    category: "quality",
    title: "ทุก collection มีสมาชิก",
    passed: emptyCollections.length === 0,
    severity: "info",
    weight: 1,
    detail: emptyCollections.length === 0 ? "ไม่มี collection ว่าง" : "มี collection ที่ยังว่าง",
    items: emptyCollections,
  });

  // Q4: every entity has a title
  const untitled = entities.filter((e) => !e.title || !e.title.trim()).map((e) => e.key);
  add({
    id: "entities-titled",
    category: "quality",
    title: "ทุก entity มีชื่อ",
    passed: untitled.length === 0,
    severity: "info",
    weight: 1,
    detail: untitled.length === 0 ? "ทุก entity มีชื่อ" : "มี entity ที่ยังไม่มีชื่อ",
    items: untitled.map(titleOf),
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

  const status: ReadinessReport["status"] =
    summary.fail > 0 ? "not-ready" : score >= 90 ? "ready" : "almost";

  return { checks, score, status, summary };
}
