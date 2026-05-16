import { describe, expect, it } from "vitest";
import { parseLibraryV1Tar } from "@/lib/library/import-v1";
import { loadFixtureBuffer } from "./helpers";

describe("parseLibraryV1Tar", () => {
  it("imports the GEN-ED sample with flat entities", async () => {
    const buf = loadFixtureBuffer("library-v1.tar.gz");
    const { library, stats } = await parseLibraryV1Tar(buf, { wrapMode: "flat" });

    expect(library.learningPackage.title).toBe("GEN0304/GEZ0302 รู้เท่าทันดิจิทัล (Final)");
    expect(library.learningPackage.key).toBe("lib:GEN-ED:Final");
    expect(stats.blockCount).toBeGreaterThan(0);
    expect(stats.skippedCount).toBe(0);

    // Every xblock has a UUID-v4-shaped id and a parsed block payload
    for (const e of library.entities) {
      expect(e.kind).toBe("xblock");
      if (e.kind === "xblock") {
        expect(e.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(e.block).toBeTruthy();
      }
    }
  });

  it("wraps everything in one Section when wrapMode='single-section'", async () => {
    const buf = loadFixtureBuffer("library-v1.tar.gz");
    const { library } = await parseLibraryV1Tar(buf, { wrapMode: "single-section" });
    const first = library.entities[0];
    expect(first.kind).toBe("container");
    if (first.kind === "container") {
      expect(first.containerKind).toBe("section");
      expect(first.children.length).toBeGreaterThan(0);
    }
  });
});
