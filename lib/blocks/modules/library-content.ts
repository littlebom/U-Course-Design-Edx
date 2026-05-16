import { Library } from "lucide-react";
import { LibraryContentView } from "@/components/blocks/LibraryContentView";
import type { LibraryContentBlock, Block } from "@/lib/schema";
import type { BlockModule } from "../types";

export const libraryContentModule: BlockModule<"library_content"> = {
  type: "library_content",
  meta: {
    icon: Library,
    iconBg: "bg-teal-600",
    badgeColor: "secondary",
    title: "Library Content",
  },
  badgeLabel: (block) => `สุ่ม ${block.maxCount} ข้อ`,
  Editor: ({ block }: { block: Block }) => LibraryContentView({ block: block as LibraryContentBlock }),
  empty: (overrides) => ({
    type: "library_content",
    displayName: "Library Content ใหม่",
    sourceLibraryId: "",
    maxCount: 1,
    rawXml: "<library_content/>",
    rawUrlName: "",
    ...overrides,
  }) as LibraryContentBlock,
};
