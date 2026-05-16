import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { parseLibraryZip } from "@/lib/library/import";
import { buildLibraryZipAsync } from "@/lib/library/export";
import { loadFixtureBuffer } from "./helpers";

describe("Library v2 round-trip", () => {
  it("imports lib-gen-ed-001 sample", async () => {
    const buf = loadFixtureBuffer("library-v2.zip");
    const { library, warnings } = await parseLibraryZip(buf);
    expect(library.learningPackage.title).toBe("Welcome to Open Edx");
    expect(library.learningPackage.key).toBe("lib:GEN-ED:001");
    expect(library.entities.length).toBeGreaterThan(0);
    expect(warnings).toEqual([]);
  });

  it("exports a zip that re-parses with the same entity count + key", async () => {
    const imported = await parseLibraryZip(loadFixtureBuffer("library-v2.zip"));

    const { bytes, warnings: exportWarnings } = await buildLibraryZipAsync({
      library: imported.library,
      assets: imported.assets,
    });
    expect(exportWarnings).toEqual([]);

    // Quick structural check on the zip — must contain package.toml
    const files = unzipSync(bytes);
    expect(files["package.toml"]).toBeDefined();
    expect(strFromU8(files["package.toml"])).toContain("Welcome to Open Edx");
    expect(strFromU8(files["package.toml"])).toContain('key = "lib:GEN-ED:001"');

    // Re-import the exported bytes
    const ab = new ArrayBuffer(bytes.length);
    new Uint8Array(ab).set(bytes);
    const reimported = await parseLibraryZip(ab);
    expect(reimported.library.entities.length).toBe(imported.library.entities.length);
    expect(reimported.library.learningPackage.key).toBe(imported.library.learningPackage.key);
  });
});
