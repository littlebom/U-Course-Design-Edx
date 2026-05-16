import { Code2 } from "lucide-react";
import { UnknownView } from "@/components/blocks/UnknownView";
import type { UnknownBlock, Block } from "@/lib/schema";
import type { BlockModule } from "../types";

export const unknownModule: BlockModule<"unknown"> = {
  type: "unknown",
  meta: {
    icon: Code2,
    iconBg: "bg-slate-500",
    badgeColor: "secondary",
    title: "Unknown Block",
  },
  badgeLabel: () => "Pass-through",
  Editor: ({ block }: { block: Block }) => UnknownView({ block: block as UnknownBlock }),
  empty: (overrides) => ({
    type: "unknown",
    displayName: "Unknown",
    blockType: "unknown",
    rawXml: "<unknown/>",
    rawUrlName: "",
    ...overrides,
  }) as UnknownBlock,
};
