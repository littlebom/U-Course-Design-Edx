import { uuidV4 } from "@/lib/uuid";
import type { ContainerKind, LibraryEntity } from "@/lib/library/schema";
import type { AddEntityKind } from "./AddEntityMenu";

// Factory: produce a fresh entity for the given add-menu choice. Keeps the
// editor page free of inline switch-on-kind clutter.
export function makeLibraryEntity(kind: AddEntityKind): LibraryEntity {
  if (kind === "xblock-problem") {
    const uuid = uuidV4();
    return {
      kind: "xblock",
      key: `xblock.v1:problem:${uuid}`,
      title: "New Problem",
      xblockType: "problem",
      uuid,
      draftVersion: 1,
      publishedVersion: 1,
      canStandAlone: true,
      block: {
        type: "problem",
        displayName: "New Problem",
        problemType: "multiplechoice",
        question: "<p>คำถาม</p>",
        choices: [
          { text: "ตัวเลือก 1", correct: true },
          { text: "ตัวเลือก 2", correct: false },
        ],
      },
    };
  }
  if (kind === "xblock-html") {
    const uuid = uuidV4();
    return {
      kind: "xblock",
      key: `xblock.v1:html:${uuid}`,
      title: "New HTML",
      xblockType: "html",
      uuid,
      draftVersion: 1,
      publishedVersion: 1,
      canStandAlone: true,
      block: { type: "html", displayName: "New HTML", html: "<p>เนื้อหา</p>" },
    };
  }
  // Container kinds: section / subsection / unit
  const containerKind = kind as ContainerKind;
  const slug = `${containerKind}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    kind: "container",
    key: slug,
    title: `New ${containerKind}`,
    containerKind,
    draftVersion: 1,
    publishedVersion: 1,
    canStandAlone: true,
    children: [],
  };
}
