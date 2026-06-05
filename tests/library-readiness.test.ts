import { describe, expect, it } from "vitest";
import { checkLibraryReadiness } from "@/lib/library/readiness";
import type { Library, LibraryEntity } from "@/lib/library/schema";
import type { Block } from "@/lib/schema";

function validMc(): Block {
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

function xblock(key: string, block: Block, title = "Block"): LibraryEntity {
  return {
    kind: "xblock",
    key,
    title,
    xblockType: block.type,
    uuid: key,
    draftVersion: 1,
    publishedVersion: 1,
    canStandAlone: true,
    block,
  } as LibraryEntity;
}

function container(key: string, children: string[], title = "Section"): LibraryEntity {
  return {
    kind: "container",
    key,
    title,
    containerKind: "section",
    draftVersion: 1,
    publishedVersion: 1,
    canStandAlone: true,
    children,
  } as LibraryEntity;
}

function makeLib(over: Partial<Library> = {}): Library {
  return {
    meta: { formatVersion: 1, createdBy: "t", createdByEmail: "t@e.com", createdAt: "2026-01-01T00:00:00Z", originServer: "x" },
    learningPackage: { title: "Lib", key: "lib:GEN-ED:Final", description: "", created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" },
    entities: [xblock("xblock.v1:problem:u1", validMc(), "P1")],
    collections: [],
    ...over,
  } as unknown as Library;
}

function check(lib: Library, id: string) {
  const r = checkLibraryReadiness(lib);
  return { report: r, c: r.checks.find((x) => x.id === id)! };
}

describe("checkLibraryReadiness", () => {
  it("a clean library is ready (100, no fail)", () => {
    const r = checkLibraryReadiness(makeLib());
    expect(r.score).toBe(100);
    expect(r.status).toBe("ready");
    expect(r.summary.fail).toBe(0);
  });

  it("bad library key → fail + not-ready", () => {
    const { report, c } = check(makeLib({ learningPackage: { title: "L", key: "bad-key" } as Library["learningPackage"] }), "lib-key-valid");
    expect(c.passed).toBe(false);
    expect(report.status).toBe("not-ready");
  });

  it("library-v1 reference inside an xblock → fail", () => {
    const lib = makeLib({
      entities: [
        xblock("xblock.v1:library_content:u2", {
          type: "library_content",
          displayName: "L",
          sourceLibraryId: "library-v1:GEN-ED+OLD",
          maxCount: 1,
          rawXml: '<library_content source_library_id="library-v1:GEN-ED+OLD"/>',
          rawUrlName: "x",
        } as Block),
      ],
    });
    const { report, c } = check(lib, "no-library-v1");
    expect(c.passed).toBe(false);
    expect(report.status).toBe("not-ready");
  });

  it("duplicate entity keys → fail", () => {
    const lib = makeLib({ entities: [xblock("dup", validMc()), xblock("dup", validMc())] });
    expect(check(lib, "unique-keys").c.passed).toBe(false);
  });

  it("dangling container child → warn", () => {
    const lib = makeLib({ entities: [xblock("xblock.v1:problem:u1", validMc()), container("sec", ["missing-key"])] });
    expect(check(lib, "no-dangling-refs").c.passed).toBe(false);
  });

  it("invalid problem content → fail", () => {
    const badMc = { type: "problem", displayName: "P", problemType: "multiplechoice", question: "<p>q</p>", choices: [{ text: "a", correct: true }, { text: "b", correct: true }] } as Block;
    expect(check(makeLib({ entities: [xblock("x", badMc)] }), "content-valid").c.passed).toBe(false);
  });

  it("empty container → quality warning (info)", () => {
    const lib = makeLib({ entities: [xblock("xblock.v1:problem:u1", validMc()), container("sec", [])] });
    expect(check(lib, "containers-filled").c.passed).toBe(false);
  });
});
