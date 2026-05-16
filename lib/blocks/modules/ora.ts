import { BookOpenCheck } from "lucide-react";
import { OraView } from "@/components/blocks/OraView";
import type { OraBlock, Block } from "@/lib/schema";
import type { BlockModule } from "../types";

export const oraModule: BlockModule<"ora"> = {
  type: "ora",
  meta: {
    icon: BookOpenCheck,
    iconBg: "bg-rose-600",
    badgeColor: "secondary",
    title: "Open Response Assessment",
  },
  badgeLabel: () => "Pass-through",
  // OraView only needs the block, not update — adapter wraps it
  Editor: ({ block }: { block: Block }) => OraView({ block: block as OraBlock }),
  empty: (overrides) => ({
    type: "ora",
    displayName: "ORA ใหม่",
    assessmentTypes: [],
    hasFileUpload: false,
    rawXml: "<openassessment/>",
    rawUrlName: "",
    ...overrides,
  }) as OraBlock,
};
