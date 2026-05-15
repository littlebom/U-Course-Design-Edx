import { courseSchema, type Course } from "./schema";

export interface ParseXmlResult {
  course: Course;
  warnings: string[];
}

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? "";
}

function boolAttr(el: Element, name: string, def = false): boolean {
  const v = el.getAttribute(name);
  return v === null ? def : v === "true";
}

function parseBlock(el: Element, warnings: string[]): object | null {
  const tag = el.tagName;
  const name = el.getAttribute("displayName") || `<${tag}>`;

  if (tag === "html") {
    return {
      type: "html" as const,
      displayName: attr(el, "displayName"),
      html: el.textContent ?? "",
    };
  }

  if (tag === "video") {
    return {
      type: "video" as const,
      displayName: attr(el, "displayName"),
      youtubeId: attr(el, "youtubeId"),
      downloadAllowed: boolAttr(el, "downloadAllowed", false),
    };
  }

  if (tag === "problem") {
    const questionEl = el.querySelector(":scope > question");
    const explanationEl = el.querySelector(":scope > explanation");
    const choiceEls = el.querySelectorAll(":scope > choices > choice");
    const maxAttemptsRaw = el.getAttribute("maxAttempts");
    const showAnswerRaw = el.getAttribute("showAnswer");

    const choices = Array.from(choiceEls).map((c) => ({
      text: c.textContent ?? "",
      correct: c.getAttribute("correct") === "true",
    }));

    // ถ้า choices < 2 ให้เติม placeholder แทนการ throw
    if (choices.length < 2) {
      warnings.push(`Problem "${name}": พบตัวเลือก ${choices.length} ข้อ (ต้องการอย่างน้อย 2) — เติม placeholder อัตโนมัติ`);
      while (choices.length < 2) {
        choices.push({ text: `ตัวเลือก ${choices.length + 1} (placeholder)`, correct: choices.length === 0 });
      }
    }

    const question = questionEl?.textContent ?? "";
    return {
      type: "problem" as const,
      displayName: attr(el, "displayName"),
      problemType: (el.getAttribute("problemType") ?? "multiplechoice") as
        | "multiplechoice"
        | "checkbox",
      question: question || `<p>${name}</p>`,
      choices,
      ...(maxAttemptsRaw !== null ? { maxAttempts: Number(maxAttemptsRaw) } : {}),
      ...(showAnswerRaw !== null ? { showAnswer: showAnswerRaw } : {}),
      ...(explanationEl?.textContent ? { explanation: explanationEl.textContent } : {}),
    };
  }

  warnings.push(`ข้าม block ไม่รู้จัก: <${tag} displayName="${name}">`);
  return null;
}

export function parseXmlCourse(xmlText: string): ParseXmlResult {
  const warnings: string[] = [];

  const doc = new DOMParser().parseFromString(xmlText, "application/xml");

  const parseError = doc.querySelector("parseerror, parsererror");
  if (parseError) {
    throw new Error(`XML ไม่ถูกต้อง: ${parseError.textContent?.slice(0, 200)}`);
  }

  const root = doc.documentElement;
  if (root.tagName !== "course") throw new Error('Root element ต้องเป็น <course>');

  // about
  const aboutEl = root.querySelector(":scope > about");
  const about = aboutEl
    ? {
        shortDescription: attr(aboutEl, "shortDescription"),
        overview: attr(aboutEl, "overview"),
        effort: attr(aboutEl, "effort"),
        duration: attr(aboutEl, "duration"),
        introVideoYoutubeId: attr(aboutEl, "introVideoYoutubeId"),
        subtitle: attr(aboutEl, "subtitle"),
      }
    : undefined;

  // grading
  const gradingEl = root.querySelector(":scope > grading");
  const cutoffsEl = gradingEl?.querySelector(":scope > cutoffs");
  const cutoffs: Record<string, number> = {};
  if (cutoffsEl) {
    for (const a of cutoffsEl.attributes) {
      const n = Number(a.value);
      if (!isNaN(n)) cutoffs[a.name] = n;
    }
  }
  const graders = gradingEl
    ? Array.from(gradingEl.querySelectorAll(":scope > grader")).map((g) => ({
        type: attr(g, "type"),
        shortLabel: attr(g, "shortLabel"),
        minCount: Number(attr(g, "minCount")),
        dropCount: Number(g.getAttribute("dropCount") ?? "0"),
        weight: Number(attr(g, "weight")),
      }))
    : [];

  // chapters — ข้าม vertical/sequential/chapter ที่ว่างเปล่าหลัง sanitize
  const chapters = Array.from(root.querySelectorAll(":scope > chapter")).flatMap((chEl) => {
    const chName = attr(chEl, "displayName") || "Chapter";

    const sequentials = Array.from(chEl.querySelectorAll(":scope > sequential")).flatMap((seqEl) => {
      const seqName = attr(seqEl, "displayName") || "Sequential";

      const verticals = Array.from(seqEl.querySelectorAll(":scope > vertical")).flatMap((vEl) => {
        const vName = attr(vEl, "displayName") || "Vertical";

        const blocks = Array.from(vEl.children)
          .map((b) => parseBlock(b, warnings))
          .filter((b): b is object => b !== null);

        if (blocks.length === 0) {
          warnings.push(`ข้าม vertical "${vName}" ใน "${seqName}": ไม่มี block ที่ถูกต้อง`);
          return [];
        }
        return [{ displayName: vName, blocks }];
      });

      if (verticals.length === 0) {
        warnings.push(`ข้าม sequential "${seqName}" ใน "${chName}": ไม่มี vertical ที่ถูกต้อง`);
        return [];
      }
      return [{
        displayName: seqName,
        ...(seqEl.hasAttribute("format") ? { format: attr(seqEl, "format") } : {}),
        verticals,
      }];
    });

    if (sequentials.length === 0) {
      warnings.push(`ข้าม chapter "${chName}": ไม่มี sequential ที่ถูกต้อง`);
      return [];
    }
    return [{ displayName: chName, sequentials }];
  });

  if (chapters.length === 0) {
    throw new Error("ไม่พบ chapter ที่ถูกต้องในไฟล์ กรุณาตรวจสอบโครงสร้าง XML");
  }

  const raw = {
    course: {
      org: attr(root, "org"),
      courseCode: attr(root, "courseCode"),
      run: attr(root, "run"),
      displayName: attr(root, "displayName"),
      language: root.getAttribute("language") ?? "en",
      start: root.getAttribute("start") ?? "2026-01-01T00:00:00Z",
      selfPaced: boolAttr(root, "selfPaced", true),
    },
    about,
    grading: { cutoffs: Object.keys(cutoffs).length ? cutoffs : { Pass: 0.5 }, graders },
    chapters,
  };

  const result = courseSchema.safeParse(raw);
  if (!result.success) {
    // พยายาม report ทุก issue แต่ไม่ throw — ถ้า parse ได้บางส่วนก็ยังดี
    for (const issue of result.error.issues) {
      const path = issue.path.join(" › ");
      warnings.push(`Schema warning: ${issue.message}${path ? ` (ที่: ${path})` : ""}`);
    }
    // ถ้า parse ไม่ได้เลย throw
    throw new Error(
      `Schema ไม่ถูกต้อง: ${result.error.issues[0]?.message ?? "unknown"} — ` +
      `ตรวจสอบ ${result.error.issues.length} รายการใน warnings`
    );
  }

  return { course: result.data, warnings };
}
