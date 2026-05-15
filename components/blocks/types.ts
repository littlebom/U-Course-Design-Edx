import type { Block } from "@/lib/schema";

// Shared callback type for block-field editors
export type BlockUpdateFn = (mut: (b: Block) => void) => void;
