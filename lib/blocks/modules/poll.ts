import { BarChart2 } from "lucide-react";
import { PollFields } from "@/components/blocks/PollFields";
import type { PollBlock } from "@/lib/schema";
import type { BlockModule } from "../types";

export const pollModule: BlockModule<"poll"> = {
  type: "poll",
  meta: {
    icon: BarChart2,
    iconBg: "bg-purple-500",
    badgeColor: "secondary",
    title: "Poll",
  },
  badgeLabel: () => "สำรวจความคิดเห็น",
  Editor: PollFields,
  empty: (overrides) => ({
    type: "poll",
    displayName: "Poll ใหม่",
    question: "คำถาม",
    answers: [
      { id: "A", label: "ใช่", img: "" },
      { id: "B", label: "ไม่ใช่", img: "" },
    ],
    privateResults: false,
    maxSubmissions: 1,
    feedback: "",
    ...overrides,
  }) as PollBlock,
};
