import type { Course } from "./schema";

const ASSET_RE = /asset:\/\/([A-Za-z0-9_.\-/]+)/g;

export type ValidationIssue = { level: "error" | "warning"; message: string };

export function validateCourse(course: Course, assetNames: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const referenced = new Set<string>();

  course.chapters.forEach((ch, ci) => {
    if (ch.sequentials.length === 0)
      issues.push({ level: "error", message: `บทที่ ${ci + 1} ไม่มี sequential` });
    ch.sequentials.forEach((seq) => {
      if (seq.verticals.length === 0)
        issues.push({ level: "error", message: `${ch.displayName} › ${seq.displayName} ไม่มี vertical` });
      seq.verticals.forEach((v) => {
        if (v.blocks.length === 0)
          issues.push({ level: "warning", message: `${v.displayName} ไม่มี block` });
        v.blocks.forEach((b) => {
          const where = `${ch.displayName} › ${seq.displayName} › ${v.displayName} › ${b.displayName}`;
          if (b.type === "html") {
            for (const m of b.html.matchAll(ASSET_RE)) referenced.add(m[1]);
          } else if (b.type === "video") {
            if (!b.youtubeId.trim())
              issues.push({ level: "error", message: `${where}: video ไม่มี YouTube ID` });
          } else if (b.type === "discussion") {
            // no additional validation required
          } else if (b.type === "lti") {
            if (!b.launchUrl.trim())
              issues.push({ level: "error", message: `${where}: LTI ไม่มี Launch URL` });
          } else if (b.type === "poll") {
            if (!b.question.trim())
              issues.push({ level: "error", message: `${where}: Poll ไม่มีคำถาม` });
            if (b.answers.length < 2)
              issues.push({ level: "error", message: `${where}: Poll ต้องมีตัวเลือกอย่างน้อย 2 ข้อ` });
          } else if (b.type === "problem") {
            const pb = b;
            const kind = pb.problemType;
            if (kind === "multiplechoice" || kind === "checkbox" || kind === "dropdown") {
              const choices = pb.choices ?? [];
              if (choices.length < 2)
                issues.push({ level: "error", message: `${where}: ต้องมีตัวเลือกอย่างน้อย 2 ข้อ` });
              const correct = choices.filter((c) => c.correct).length;
              if (correct === 0)
                issues.push({ level: "error", message: `${where}: ไม่มี choice ที่ถูก` });
              if ((kind === "multiplechoice" || kind === "dropdown") && correct > 1)
                issues.push({ level: "error", message: `${where}: ${kind} ต้องมีคำตอบถูกข้อเดียว` });
            } else if (kind === "numerical") {
              if (pb.numericalAnswer == null || Number.isNaN(pb.numericalAnswer))
                issues.push({ level: "error", message: `${where}: Numerical ต้องระบุคำตอบเป็นตัวเลข` });
            } else if (kind === "text") {
              const answers = (pb.textAnswers ?? []).filter((a) => a.trim().length > 0);
              if (answers.length === 0)
                issues.push({ level: "error", message: `${where}: Text ต้องมีคำตอบที่ถูกอย่างน้อย 1 รายการ` });
            }
          }
        });
      });
    });
  });

  for (const ref of referenced) {
    if (!assetNames.has(ref))
      issues.push({ level: "error", message: `Missing asset: ${ref}` });
  }

  return issues;
}
