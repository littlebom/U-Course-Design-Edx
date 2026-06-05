import { describe, expect, it } from "vitest";
import { cleanCourse } from "@/lib/clean";
import { validateCourse } from "@/lib/validate";
import type { Course, Block, Vertical, Sequential, Chapter } from "@/lib/schema";

const NO_ASSETS = new Set<string>();

// ── Minimal tree builders (cleanCourse/validateCourse only read .chapters) ──
function vert(name: string, blocks: Block[]): Vertical {
  return { displayName: name, blocks } as Vertical;
}
function seq(name: string, verticals: Vertical[]): Sequential {
  return { displayName: name, verticals } as Sequential;
}
function chap(name: string, sequentials: Sequential[]): Chapter {
  return { displayName: name, sequentials } as Chapter;
}
function course(chapters: Chapter[]): Course {
  return { chapters } as unknown as Course;
}
// One chapter / one sequential / one vertical holding the given blocks.
function single(blocks: Block[]): Course {
  return course([chap("บท 1", [seq("สัปดาห์ 1", [vert("หน่วย 1", blocks)])])]);
}

function mc(name: string, choices: { text: string; correct: boolean }[]): Block {
  return { type: "problem", displayName: name, problemType: "multiplechoice", question: "<p>q?</p>", choices } as Block;
}

describe("cleanCourse — problem auto-fix", () => {
  it("multiplechoice with >1 correct → keeps only the first correct (fixed)", () => {
    const c = single([
      mc("P", [
        { text: "a", correct: true },
        { text: "b", correct: true },
        { text: "c", correct: false },
      ]),
    ]);
    const { course: out, actions } = cleanCourse(c, NO_ASSETS);
    const block = out.chapters[0].sequentials[0].verticals[0].blocks[0];
    const choices = block.type === "problem" ? block.choices ?? [] : [];
    expect(choices.filter((x) => x.correct)).toHaveLength(1);
    expect(choices[0].correct).toBe(true);
    expect(actions.some((a) => a.type === "fixed")).toBe(true);
    // error must be gone afterwards
    expect(validateCourse(out, NO_ASSETS).filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("choice problem with 0 correct → marks first correct (fixed)", () => {
    const c = single([
      mc("P", [
        { text: "a", correct: false },
        { text: "b", correct: false },
      ]),
    ]);
    const { course: out } = cleanCourse(c, NO_ASSETS);
    const block = out.chapters[0].sequentials[0].verticals[0].blocks[0];
    const choices = block.type === "problem" ? block.choices ?? [] : [];
    expect(choices[0].correct).toBe(true);
    expect(validateCourse(out, NO_ASSETS).filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("choice problem with <2 choices → pads to 2 placeholders (fixed)", () => {
    const c = single([mc("P", [{ text: "only", correct: true }])]);
    const { course: out } = cleanCourse(c, NO_ASSETS);
    const block = out.chapters[0].sequentials[0].verticals[0].blocks[0];
    const choices = block.type === "problem" ? block.choices ?? [] : [];
    expect(choices.length).toBeGreaterThanOrEqual(2);
    expect(validateCourse(out, NO_ASSETS).filter((i) => i.level === "error")).toHaveLength(0);
  });
});

describe("cleanCourse — un-fixable removal", () => {
  it("numerical with no answer → removes block", () => {
    const numerical = { type: "problem", displayName: "N", problemType: "numerical", question: "<p>q</p>" } as Block;
    const c = single([numerical, mc("keep", [{ text: "a", correct: true }, { text: "b", correct: false }])]);
    const { course: out, actions } = cleanCourse(c, NO_ASSETS);
    const blocks = out.chapters[0].sequentials[0].verticals[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].displayName).toBe("keep");
    expect(actions.some((a) => a.type === "removed")).toBe(true);
  });

  it("video with empty YouTube ID → removes block", () => {
    const video = { type: "video", displayName: "V", youtubeId: "", mp4Url: "", downloadAllowed: false, transcripts: [], edxVideoId: "" } as Block;
    const c = single([video, mc("keep", [{ text: "a", correct: true }, { text: "b", correct: false }])]);
    const { course: out } = cleanCourse(c, NO_ASSETS);
    const blocks = out.chapters[0].sequentials[0].verticals[0].blocks;
    expect(blocks.map((b) => b.displayName)).toEqual(["keep"]);
  });
});

describe("cleanCourse — container pruning", () => {
  it("removing the only block prunes its vertical/sequential and keeps the last chapter", () => {
    const badNumerical = { type: "problem", displayName: "N", problemType: "numerical", question: "<p>q</p>" } as Block;
    const c = single([badNumerical]);
    const { course: out, actions } = cleanCourse(c, NO_ASSETS);
    // Course must still have ≥1 chapter (schema invariant)
    expect(out.chapters).toHaveLength(1);
    expect(actions.some((a) => a.type === "removed")).toBe(true); // block + empty containers
    expect(actions.some((a) => a.type === "skipped")).toBe(true); // last empty chapter kept
  });

  it("prunes one empty vertical but keeps a sibling vertical that still has content", () => {
    const badVideo = { type: "video", displayName: "V", youtubeId: "", mp4Url: "", downloadAllowed: false, transcripts: [], edxVideoId: "" } as Block;
    const good = mc("keep", [{ text: "a", correct: true }, { text: "b", correct: false }]);
    const c = course([
      chap("บท 1", [seq("สัปดาห์ 1", [vert("ว่างหลังลบ", [badVideo]), vert("มีเนื้อหา", [good])])]),
    ]);
    const { course: out } = cleanCourse(c, NO_ASSETS);
    const verts = out.chapters[0].sequentials[0].verticals;
    expect(verts.map((v) => v.displayName)).toEqual(["มีเนื้อหา"]);
  });
});

describe("cleanCourse — purity", () => {
  it("does not mutate the input course", () => {
    const c = single([
      mc("P", [
        { text: "a", correct: true },
        { text: "b", correct: true },
      ]),
    ]);
    cleanCourse(c, NO_ASSETS);
    const block = c.chapters[0].sequentials[0].verticals[0].blocks[0];
    const choices = block.type === "problem" ? block.choices ?? [] : [];
    // original still has 2 correct — untouched
    expect(choices.filter((x) => x.correct)).toHaveLength(2);
  });
});
