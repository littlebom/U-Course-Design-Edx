import { courseSchema, type Course } from "./schema";

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? "";
}

function boolAttr(el: Element, name: string, def = false): boolean {
  const v = el.getAttribute(name);
  return v === null ? def : v === "true";
}

function parseBlock(el: Element) {
  const tag = el.tagName;

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
    return {
      type: "problem" as const,
      displayName: attr(el, "displayName"),
      problemType: (el.getAttribute("problemType") ?? "multiplechoice") as
        | "multiplechoice"
        | "checkbox",
      question: questionEl?.textContent ?? "",
      choices: Array.from(choiceEls).map((c) => ({
        text: c.textContent ?? "",
        correct: c.getAttribute("correct") === "true",
      })),
      ...(maxAttemptsRaw !== null ? { maxAttempts: Number(maxAttemptsRaw) } : {}),
      ...(showAnswerRaw !== null ? { showAnswer: showAnswerRaw } : {}),
      ...(explanationEl?.textContent ? { explanation: explanationEl.textContent } : {}),
    };
  }

  throw new Error(`ไม่รู้จัก block type: <${tag}>`);
}

export function parseXmlCourse(xmlText: string): Course {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");

  const parseError = doc.querySelector("parsererror");
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

  // chapters
  const chapters = Array.from(root.querySelectorAll(":scope > chapter")).map((chEl) => ({
    displayName: attr(chEl, "displayName"),
    sequentials: Array.from(chEl.querySelectorAll(":scope > sequential")).map((seqEl) => ({
      displayName: attr(seqEl, "displayName"),
      ...(seqEl.hasAttribute("format") ? { format: attr(seqEl, "format") } : {}),
      verticals: Array.from(seqEl.querySelectorAll(":scope > vertical")).map((vEl) => ({
        displayName: attr(vEl, "displayName"),
        blocks: Array.from(vEl.children).map(parseBlock),
      })),
    })),
  }));

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
    throw new Error(`Schema ไม่ถูกต้อง: ${result.error.issues[0]?.message ?? "unknown"}`);
  }
  return result.data;
}
