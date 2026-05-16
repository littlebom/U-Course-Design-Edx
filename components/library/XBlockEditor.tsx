"use client";

import type { Course } from "@/lib/schema";
import type { LibraryXBlock } from "@/lib/library/schema";
import { BlockEditor } from "@/components/BlockEditor";

// Adapter: wrap a single LibraryXBlock into a one-chapter / one-sequential /
// one-vertical / one-block Course so we can reuse the full BlockEditor without
// duplicating its per-type fields here.
export function XBlockEditor({
  xblock, assets, onChange,
}: {
  xblock: LibraryXBlock;
  assets: Map<string, File>;
  onChange: (fn: (x: LibraryXBlock) => void) => void;
}) {
  const fakeCourse: Course = {
    course: {
      org: "lib", courseCode: "lib", run: "lib", displayName: "", language: "th",
      start: "2026-01-01T00:00:00Z", selfPaced: true,
      invitationOnly: false, catalogVisibility: "both",
    },
    about: {
      courseImageName: "", overview: "", shortDescription: "",
      effort: "", duration: "", subtitle: "", introVideoYoutubeId: "",
    },
    grading: { cutoffs: { Pass: 0.5 }, graders: [] },
    chapters: [{
      displayName: "",
      sequentials: [{
        displayName: "",
        verticals: [{ displayName: "", blocks: [xblock.block] }],
      }],
    }],
  };

  const assetFileMap = new Map(
    Array.from(assets.entries()).map(([k, f]) => [k, { name: k, size: f.size, blob: f }]),
  );

  return (
    <BlockEditor
      course={fakeCourse}
      path={{ ci: 0, si: 0, vi: 0, bi: 0 }}
      onChange={(next) => {
        const newBlock = next.chapters[0].sequentials[0].verticals[0].blocks[0];
        onChange((x) => {
          x.block = newBlock;
          // Keep entity title in sync with displayName so list shows the latest name
          x.title = newBlock.displayName;
        });
      }}
      assets={assetFileMap}
      onAddAsset={(_file, suggestedName) => suggestedName ?? "asset"}
    />
  );
}
