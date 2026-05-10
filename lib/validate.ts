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
          } else {
            const correct = b.choices.filter((c) => c.correct).length;
            if (correct === 0)
              issues.push({ level: "error", message: `${where}: ไม่มี choice ที่ถูก` });
            if (b.problemType === "multiplechoice" && correct > 1)
              issues.push({ level: "error", message: `${where}: MCQ ต้องมีคำตอบถูกข้อเดียว` });
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
