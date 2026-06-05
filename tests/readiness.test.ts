import { describe, expect, it } from "vitest";
import { checkUlmoReadiness } from "@/lib/readiness";
import type { Course, Block } from "@/lib/schema";

const NO_ASSETS = new Set<string>();

function mc(): Block {
  return {
    type: "problem",
    displayName: "P",
    problemType: "multiplechoice",
    question: "<p>q</p>",
    choices: [
      { text: "a", correct: true },
      { text: "b", correct: false },
    ],
  } as Block;
}

interface Opts {
  blocks?: Block[];
  format?: string;
  graders?: { type: string; weight: number }[];
  start?: string;
  end?: string;
  org?: string;
}

// A fully-valid base course; override pieces per test.
function makeCourse(o: Opts = {}): Course {
  const graders = (o.graders ?? [{ type: "Homework", weight: 1 }]).map((g) => ({
    type: g.type,
    shortLabel: g.type.slice(0, 2),
    minCount: 1,
    dropCount: 0,
    weight: g.weight,
  }));
  return {
    course: {
      org: o.org ?? "UofX",
      courseCode: "CS101",
      run: "2026",
      displayName: "Test Course",
      language: "th",
      start: o.start ?? "2026-01-01T00:00:00Z",
      ...(o.end !== undefined ? { end: o.end } : { end: "2026-06-01T00:00:00Z" }),
      invitationOnly: false,
      catalogVisibility: "both",
      selfPaced: true,
    },
    about: {
      shortDescription: "สั้น",
      overview: "ภาพรวม",
      effort: "",
      duration: "",
      introVideoYoutubeId: "",
      subtitle: "",
      courseImageName: "cover.jpg",
    },
    grading: { cutoffs: { Pass: 0.5 }, graders },
    chapters: [
      {
        displayName: "บท 1",
        sequentials: [
          {
            displayName: "สัปดาห์ 1",
            ...(o.format !== undefined ? { format: o.format } : { format: "Homework" }),
            verticals: [{ displayName: "หน่วย 1", blocks: o.blocks ?? [mc()] }],
          },
        ],
      },
    ],
  } as unknown as Course;
}

function get(course: Course, id: string) {
  const r = checkUlmoReadiness(course, NO_ASSETS);
  return { report: r, check: r.checks.find((c) => c.id === id)! };
}

describe("checkUlmoReadiness — happy path", () => {
  it("a complete, valid course scores 100 and is ready", () => {
    const r = checkUlmoReadiness(makeCourse(), NO_ASSETS);
    expect(r.score).toBe(100);
    expect(r.status).toBe("ready");
    expect(r.summary.fail).toBe(0);
  });
});

describe("checkUlmoReadiness — compat checks", () => {
  it("library-v1 reference → fail + not-ready", () => {
    const libBlock = {
      type: "library_content",
      displayName: "Lib",
      sourceLibraryId: "library-v1:UofX+OLD",
      maxCount: 1,
      rawXml: '<library_content source_library_id="library-v1:UofX+OLD" />',
      rawUrlName: "abc",
    } as Block;
    const { report, check } = get(makeCourse({ blocks: [mc(), libBlock] }), "no-library-v1");
    expect(check.passed).toBe(false);
    expect(report.status).toBe("not-ready");
    // a failing course must score lower than the perfect one
    expect(report.score).toBeLessThan(100);
  });

  it("unknown block → warns (known-block-types)", () => {
    const unknown = {
      type: "unknown",
      displayName: "??",
      blockType: "weird",
      rawXml: "<weird/>",
      rawUrlName: "x",
    } as Block;
    const { check } = get(makeCourse({ blocks: [mc(), unknown] }), "known-block-types");
    expect(check.passed).toBe(false);
    expect(check.severity).toBe("warn");
  });

  it("invalid course key (blank org) → fail", () => {
    const { check, report } = get(makeCourse({ org: "" }), "course-key-valid");
    expect(check.passed).toBe(false);
    expect(report.status).toBe("not-ready");
  });

  it("LTI with keyset but no OIDC → warns", () => {
    const lti = {
      type: "lti",
      displayName: "LTI",
      ltiVersion: "lti_1p3",
      launchUrl: "https://tool.example/launch",
      oidcUrl: "",
      keysetUrl: "https://tool.example/keys",
      hasScore: false,
      weight: 1,
      launchTarget: "new_window",
      buttonText: "",
    } as Block;
    const { check } = get(makeCourse({ blocks: [lti] }), "lti-1p3-complete");
    expect(check.passed).toBe(false);
  });

  it("dates out of order (start after end) → warns", () => {
    const { check } = get(
      makeCourse({ start: "2026-06-01T00:00:00Z", end: "2026-01-01T00:00:00Z" }),
      "dates-valid",
    );
    expect(check.passed).toBe(false);
  });
});

describe("checkUlmoReadiness — quality checks", () => {
  it("problems present but no graders → has-grading fails (info)", () => {
    const { check } = get(makeCourse({ graders: [], format: undefined }), "has-grading");
    expect(check.passed).toBe(false);
    expect(check.severity).toBe("info");
  });

  it("graded subsection format not in graders → warns", () => {
    const { check } = get(makeCourse({ format: "Exam", graders: [{ type: "Homework", weight: 1 }] }), "graded-format-valid");
    expect(check.passed).toBe(false);
  });

  it("grader weights not summing to 100% → warns", () => {
    const { check } = get(
      makeCourse({ graders: [{ type: "Homework", weight: 0.5 }], format: "Homework" }),
      "grader-weights",
    );
    expect(check.passed).toBe(false);
  });
});
