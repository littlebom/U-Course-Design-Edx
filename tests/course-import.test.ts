import { describe, expect, it } from "vitest";
import { parseOlxTar } from "@/lib/olxTarParse";
import { loadFixtureBuffer } from "./helpers";

describe("parseOlxTar", () => {
  it("imports the sample course (eqazmvaw run, MCQ-heavy)", async () => {
    const buf = loadFixtureBuffer("course.tar.gz");
    const { course, warnings } = await parseOlxTar(buf);

    expect(course.course.org).toBeTruthy();
    expect(course.course.courseCode).toBeTruthy();
    expect(course.chapters.length).toBeGreaterThan(0);

    // Walk and count block types — tests our 5-type parser end-to-end
    const counts: Record<string, number> = {};
    for (const ch of course.chapters)
      for (const seq of ch.sequentials)
        for (const v of seq.verticals)
          for (const b of v.blocks) counts[b.type] = (counts[b.type] ?? 0) + 1;
    expect(Object.keys(counts).length).toBeGreaterThan(0);

    // Warnings are allowed (auto-clean messages, pass-through info) but must
    // not include the hard-error markers.
    const hardErrors = warnings.filter((w) => w.startsWith("🔴"));
    // Library v1 references are expected in this sample and remain after clean
    // — anything else would be a regression.
    for (const err of hardErrors) {
      expect(err).toMatch(/Library v1|library-v1/);
    }
  });
});
