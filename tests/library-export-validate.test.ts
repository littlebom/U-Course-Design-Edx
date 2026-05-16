import { describe, expect, it } from "vitest";
import { buildLibraryZipAsync } from "@/lib/library/export";
import type { Library } from "@/lib/library/schema";

function minimalLibrary(extra: Partial<Library> = {}): Library {
  return {
    meta: {
      formatVersion: 1,
      createdBy: "test",
      createdByEmail: "test@example.com",
      createdAt: "2026-01-01T00:00:00Z",
      originServer: "localhost",
    },
    learningPackage: {
      title: "Test",
      key: "lib:Test:01",
      description: "",
      created: "2026-01-01T00:00:00Z",
      updated: "2026-01-01T00:00:00Z",
    },
    entities: [],
    collections: [],
    ...extra,
  };
}

describe("buildLibraryZipAsync validation", () => {
  it("strips dangling children refs from containers", async () => {
    const lib = minimalLibrary({
      entities: [
        {
          kind: "container",
          key: "section-1",
          title: "Section 1",
          containerKind: "section",
          draftVersion: 1,
          publishedVersion: 1,
          canStandAlone: true,
          children: ["does-not-exist"],
        },
      ],
    });
    const { warnings } = await buildLibraryZipAsync({ library: lib });
    expect(warnings.some((w) => w.includes("does-not-exist"))).toBe(true);
  });

  it("flags duplicate entity keys", async () => {
    const lib = minimalLibrary({
      entities: [
        { kind: "container", key: "dup", title: "A", containerKind: "section", draftVersion: 1, publishedVersion: 1, canStandAlone: true, children: [] },
        { kind: "container", key: "dup", title: "B", containerKind: "section", draftVersion: 1, publishedVersion: 1, canStandAlone: true, children: [] },
      ],
    });
    const { warnings } = await buildLibraryZipAsync({ library: lib });
    expect(warnings.some((w) => w.includes("ซ้ำ"))).toBe(true);
  });

  it("flags blank title", async () => {
    const lib = minimalLibrary();
    lib.learningPackage.title = "   ";
    const { warnings } = await buildLibraryZipAsync({ library: lib });
    expect(warnings.some((w) => w.includes("title ว่าง"))).toBe(true);
  });

  it("flags malformed library key", async () => {
    const lib = minimalLibrary();
    lib.learningPackage.key = "not-a-valid-key";
    const { warnings } = await buildLibraryZipAsync({ library: lib });
    expect(warnings.some((w) => w.includes("lib:Org:Code"))).toBe(true);
  });
});
