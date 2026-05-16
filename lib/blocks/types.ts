import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { Block } from "@/lib/schema";
import type { BadgeColor } from "@/lib/blockMeta";

// Static presentation metadata for a block type. Anything the icon chip or
// the badge needs that doesn't depend on the block instance.
export interface BlockTypeMeta {
  icon: LucideIcon;
  iconBg: string;
  badgeColor: BadgeColor;
  title: string;          // Default editor-header title (overridable per-instance)
}

// Editor component contract — every editor receives the block + an update fn.
// We re-state the update fn signature here to avoid a circular import with
// components/blocks/types.ts.
export type BlockUpdate = (mut: (b: Block) => void) => void;

export interface BlockEditorProps<TBlock extends Block> {
  block: TBlock;
  update: BlockUpdate;
}

// A module that fully describes one block type. New block types ship by
// dropping a new module into lib/blocks/registry.ts.
export interface BlockModule<T extends Block["type"]> {
  type: T;
  meta: BlockTypeMeta;
  // Computes the runtime badge label (may use block instance, e.g.
  // ProblemBlock's "เลือก 1 ข้อ" vs "ตัวเลข"). Returns a stable string.
  badgeLabel(block: Extract<Block, { type: T }>): string;
  // The right-pane editor component for this block type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: ComponentType<BlockEditorProps<any>>;
  // Factory: returns a fresh block of this type when the user clicks "+ Add"
  // in the outline. May accept a partial override for callers that want to
  // seed display names.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  empty(overrides?: Partial<Extract<Block, { type: T }>>): Extract<Block, { type: T }>;
}
