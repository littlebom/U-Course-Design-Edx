import type { Course, Block, ProblemBlock } from "./schema";

// One reported change from a cleanup pass.
//   fixed   — block was auto-repaired in place (content kept)
//   removed — block (or empty container) was deleted (un-fixable)
//   skipped — problem detected but intentionally left untouched (user must fix)
export type CleanAction =
  | { type: "fixed"; where: string; detail: string }
  | { type: "removed"; where: string; detail: string }
  | { type: "skipped"; where: string; detail: string };

// Mirror of the asset-reference regex used by validateCourse.
const ASSET_RE = /asset:\/\/([A-Za-z0-9_.\-/]+)/g;

// Decision for a single block. Fixing mutates the block in place (caller passes a clone).
type Decision =
  | { kind: "keep" }
  | { kind: "fixed"; detail: string }
  | { kind: "removed"; detail: string }
  | { kind: "skipped"; detail: string };

// Repair / classify a choice-or-answer based problem.
// Rules mirror lib/validate.ts so a "fixed" result clears the corresponding error.
function cleanProblem(pb: ProblemBlock): Decision {
  const kind = pb.problemType;

  if (kind === "multiplechoice" || kind === "checkbox" || kind === "dropdown") {
    const fixes: string[] = [];
    if (!pb.choices) pb.choices = [];

    // 1. Pad to at least 2 choices (precedent: lib/olx/import/parse-problem.ts)
    if (pb.choices.length < 2) {
      while (pb.choices.length < 2) {
        pb.choices.push({ text: `ตัวเลือก ${pb.choices.length + 1} (placeholder)`, correct: false });
      }
      fixes.push("เติมตัวเลือก placeholder ให้ครบ 2 ข้อ");
    }

    // 2. Single-correct enforcement (multiplechoice / dropdown only)
    if (kind === "multiplechoice" || kind === "dropdown") {
      const correctCount = pb.choices.filter((c) => c.correct).length;
      if (correctCount > 1) {
        const firstCorrect = pb.choices.findIndex((c) => c.correct);
        pb.choices.forEach((c, i) => (c.correct = i === firstCorrect));
        fixes.push(`${kind}: เก็บคำตอบถูกข้อแรก (เดิมถูก ${correctCount} ข้อ)`);
      }
    }

    // 3. Ensure at least one correct answer
    if (!pb.choices.some((c) => c.correct)) {
      pb.choices[0].correct = true;
      fixes.push("ตั้งคำตอบถูกข้อแรก (เดิมไม่มีข้อถูก)");
    }

    return fixes.length > 0 ? { kind: "fixed", detail: fixes.join("; ") } : { kind: "keep" };
  }

  if (kind === "numerical") {
    if (pb.numericalAnswer == null || Number.isNaN(pb.numericalAnswer))
      return { kind: "removed", detail: "Numerical ไม่มีคำตอบเป็นตัวเลข — แก้อัตโนมัติไม่ได้" };
    return { kind: "keep" };
  }

  if (kind === "text") {
    const answers = (pb.textAnswers ?? []).filter((a) => a.trim().length > 0);
    if (answers.length === 0)
      return { kind: "removed", detail: "Text ไม่มีคำตอบที่ถูก — แก้อัตโนมัติไม่ได้" };
    return { kind: "keep" };
  }

  return { kind: "keep" };
}

// Classify / repair a single block. Mutates the block in place when fixing.
function cleanBlock(b: Block, assetNames: Set<string>): Decision {
  switch (b.type) {
    case "problem":
      return cleanProblem(b);

    case "video":
      if (!b.youtubeId.trim())
        return { kind: "removed", detail: "video ไม่มี YouTube ID — แก้อัตโนมัติไม่ได้" };
      return { kind: "keep" };

    case "lti":
      if (!b.launchUrl.trim())
        return { kind: "removed", detail: "LTI ไม่มี Launch URL — แก้อัตโนมัติไม่ได้" };
      return { kind: "keep" };

    case "poll": {
      if (!b.question.trim())
        return { kind: "removed", detail: "Poll ไม่มีคำถาม — แก้อัตโนมัติไม่ได้" };
      if (b.answers.length < 2) {
        while (b.answers.length < 2) {
          const n = b.answers.length + 1;
          b.answers.push({ id: `opt${n}`, label: `ตัวเลือก ${n} (placeholder)`, img: "" });
        }
        return { kind: "fixed", detail: "Poll: เติมตัวเลือก placeholder ให้ครบ 2 ข้อ" };
      }
      return { kind: "keep" };
    }

    case "html": {
      const missing: string[] = [];
      for (const m of b.html.matchAll(ASSET_RE)) {
        if (!assetNames.has(m[1])) missing.push(m[1]);
      }
      if (missing.length > 0)
        return { kind: "skipped", detail: `อ้าง asset ที่หาย: ${missing.join(", ")} — ต้องแก้เอง` };
      return { kind: "keep" };
    }

    default:
      return { kind: "keep" };
  }
}

// Clean a whole course: auto-fix what's fixable, remove un-fixable blocks, then
// prune containers that became (or were) empty. Pure — operates on a clone and
// returns the cleaned course plus a report of every action taken.
export function cleanCourse(
  course: Course,
  assetNames: Set<string>,
): { course: Course; actions: CleanAction[] } {
  const next = structuredClone(course);
  const actions: CleanAction[] = [];

  // ── Pass 1: per-block fix / remove ──────────────────────────────────────
  for (const ch of next.chapters) {
    for (const seq of ch.sequentials) {
      for (const v of seq.verticals) {
        const keep: Block[] = [];
        for (const b of v.blocks) {
          const where = `${ch.displayName} › ${seq.displayName} › ${v.displayName} › ${b.displayName}`;
          const d = cleanBlock(b, assetNames);
          if (d.kind === "removed") {
            actions.push({ type: "removed", where, detail: d.detail });
            continue; // drop it
          }
          if (d.kind === "fixed") actions.push({ type: "fixed", where, detail: d.detail });
          else if (d.kind === "skipped") actions.push({ type: "skipped", where, detail: d.detail });
          keep.push(b);
        }
        v.blocks = keep;
      }
    }
  }

  // ── Pass 2: prune empty verticals → sequentials (bottom-up) ──────────────
  for (const ch of next.chapters) {
    for (const seq of ch.sequentials) {
      seq.verticals = seq.verticals.filter((v) => {
        if (v.blocks.length === 0) {
          actions.push({
            type: "removed",
            where: `${ch.displayName} › ${seq.displayName} › ${v.displayName}`,
            detail: "vertical ว่าง (ไม่มี block)",
          });
          return false;
        }
        return true;
      });
    }
    ch.sequentials = ch.sequentials.filter((seq) => {
      if (seq.verticals.length === 0) {
        actions.push({
          type: "removed",
          where: `${ch.displayName} › ${seq.displayName}`,
          detail: "sequential ว่าง (ไม่มี vertical)",
        });
        return false;
      }
      return true;
    });
  }

  // ── Pass 3: prune empty chapters — but keep at least one (schema needs ≥1) ─
  const nonEmpty = next.chapters.filter((ch) => ch.sequentials.length > 0);
  if (nonEmpty.length > 0) {
    for (const ch of next.chapters) {
      if (ch.sequentials.length === 0)
        actions.push({ type: "removed", where: ch.displayName, detail: "chapter ว่าง (ไม่มี sequential)" });
    }
    next.chapters = nonEmpty;
  } else {
    // Everything emptied out — keep the first chapter so the course stays valid.
    for (let i = 1; i < next.chapters.length; i++) {
      actions.push({ type: "removed", where: next.chapters[i].displayName, detail: "chapter ว่าง (ไม่มี sequential)" });
    }
    next.chapters = next.chapters.slice(0, 1);
    if (next.chapters[0]) {
      actions.push({
        type: "skipped",
        where: next.chapters[0].displayName,
        detail: "บทสุดท้ายว่าง — คงไว้เพราะคอร์สต้องมีอย่างน้อย 1 บท (ต้องเพิ่มเนื้อหาเอง)",
      });
    }
  }

  return { course: next, actions };
}
