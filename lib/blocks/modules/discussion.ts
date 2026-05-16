import { MessageSquare } from "lucide-react";
import { DiscussionFields } from "@/components/blocks/DiscussionFields";
import type { DiscussionBlock } from "@/lib/schema";
import type { BlockModule } from "../types";

export const discussionModule: BlockModule<"discussion"> = {
  type: "discussion",
  meta: {
    icon: MessageSquare,
    iconBg: "bg-success",
    badgeColor: "success",
    title: "Discussion",
  },
  badgeLabel: () => "กระดานสนทนา",
  Editor: DiscussionFields,
  empty: (overrides) => ({
    type: "discussion",
    displayName: "Discussion ใหม่",
    discussionCategory: "General",
    discussionTarget: "",
    ...overrides,
  }) as DiscussionBlock,
};
