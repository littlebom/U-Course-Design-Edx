import { HelpCircle } from "lucide-react";
import { ProblemFields } from "@/components/blocks/ProblemFields";
import type { ProblemBlock } from "@/lib/schema";
import type { BlockModule } from "../types";

export const problemModule: BlockModule<"problem"> = {
  type: "problem",
  meta: {
    icon: HelpCircle,
    iconBg: "bg-warning",
    badgeColor: "warning",
    title: "Problem",
  },
  badgeLabel: (block) => {
    switch (block.problemType) {
      case "multiplechoice": return "เลือก 1 ข้อ";
      case "checkbox":       return "เลือกหลายข้อ";
      case "dropdown":       return "Dropdown";
      case "numerical":      return "ตัวเลข";
      case "text":           return "ข้อความ";
      default:               return "Problem";
    }
  },
  Editor: ProblemFields,
  empty: (overrides) => ({
    type: "problem",
    displayName: "Problem ใหม่",
    problemType: "multiplechoice",
    question: "<p>คำถาม</p>",
    choices: [
      { text: "ตัวเลือก 1", correct: true },
      { text: "ตัวเลือก 2", correct: false },
    ],
    ...overrides,
  }) as ProblemBlock,
};
