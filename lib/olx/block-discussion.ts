import { create } from "xmlbuilder2";
import type { DiscussionBlock } from "../schema";

export function buildDiscussionBlock(block: DiscussionBlock, id: string): string {
  return create({ version: "1.0" })
    .ele("discussion", {
      url_name: id,
      display_name: block.displayName,
      discussion_category: block.discussionCategory || "General",
      discussion_target: block.discussionTarget || block.displayName,
      discussion_id: id,
    })
    .end({ prettyPrint: true, headless: true });
}
