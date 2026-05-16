import type { Block } from "@/lib/schema";
import type { BlockModule } from "./types";
import { htmlModule } from "./modules/html";
import { problemModule } from "./modules/problem";
import { videoModule } from "./modules/video";
import { discussionModule } from "./modules/discussion";
import { ltiModule } from "./modules/lti";
import { pollModule } from "./modules/poll";
import { oraModule } from "./modules/ora";
import { libraryContentModule } from "./modules/library-content";
import { unknownModule } from "./modules/unknown";

// Central catalogue of every block type the app supports. Adding a new type:
//   1. Create lib/blocks/modules/<type>.ts implementing BlockModule
//   2. Drop it into this map
// blockMeta, BlockEditor, and the outline's "+ add" pills all read from here.
type Registry = { [K in Block["type"]]: BlockModule<K> };

export const BLOCK_REGISTRY: Registry = {
  html: htmlModule,
  problem: problemModule,
  video: videoModule,
  discussion: discussionModule,
  lti: ltiModule,
  poll: pollModule,
  ora: oraModule,
  library_content: libraryContentModule,
  unknown: unknownModule,
};

export type BlockType = keyof typeof BLOCK_REGISTRY;

export function getBlockModule<T extends Block["type"]>(type: T): BlockModule<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return BLOCK_REGISTRY[type] as any;
}
