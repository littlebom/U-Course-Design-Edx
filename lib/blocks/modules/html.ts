import { FileText } from "lucide-react";
import { HtmlField } from "@/components/blocks/HtmlField";
import type { Block, HtmlBlock } from "@/lib/schema";
import type { BlockModule } from "../types";
import type { ComponentType } from "react";

// HtmlField receives extra asset props it pulls via component-tree wiring.
// Our generic editor contract is (block, update); HtmlField is rendered
// from BlockEditor.tsx specially because it needs asset access. For
// registry uniformity we expose a shim — but the editor switch in
// components/BlockEditor.tsx still special-cases html.
// (Keeping html out of the registry would defeat the catalog purpose, so
// we declare a no-op Editor that asserts at runtime; consumers must not
// use registry.Editor for html.)
function HtmlEditorPlaceholder() {
  throw new Error("html block uses HtmlField directly in BlockEditor (needs asset context)");
}

export const htmlModule: BlockModule<"html"> = {
  type: "html",
  meta: {
    icon: FileText,
    iconBg: "bg-default-600",
    badgeColor: "secondary",
    title: "HTML Block",
  },
  badgeLabel: () => "เนื้อหา HTML",
  Editor: HtmlEditorPlaceholder as ComponentType<{ block: Block; update: (mut: (b: Block) => void) => void }>,
  empty: (overrides) => ({
    type: "html",
    displayName: "HTML ใหม่",
    html: "<p>เนื้อหา</p>",
    ...overrides,
  }) as HtmlBlock,
};
// Re-export HtmlField so BlockEditor can import from the module file too.
export { HtmlField };
