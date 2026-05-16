import { type LucideIcon } from "lucide-react";
import type { Block, UnknownBlock } from "./schema";
import { BLOCK_REGISTRY, getBlockModule } from "./blocks/registry";

// Re-export the badge-color enum the design system uses
export type BadgeColor =
  | "default" | "secondary" | "destructive" | "success" | "warning" | "info";

export interface BlockMeta {
  icon: LucideIcon;
  iconBg: string;
  badgeColor: BadgeColor;
  title: string;
  badgeLabel: string;
}

// Resolve a full meta record for a specific block instance. Static fields
// come from the registry; runtime-derived ones (badge label, unknown-block
// title) are computed per call.
export function getBlockMeta(block: Block): BlockMeta {
  const mod = getBlockModule(block.type);
  const title = block.type === "unknown"
    ? `Unknown Block (${(block as UnknownBlock).blockType})`
    : mod.meta.title;
  return {
    icon: mod.meta.icon,
    iconBg: mod.meta.iconBg,
    badgeColor: mod.meta.badgeColor,
    title,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    badgeLabel: (mod.badgeLabel as any)(block),
  };
}

// Lightweight variant — visuals only, no instance required. Used by the
// outline row icon chip.
export function getBlockVisuals(type: Block["type"]): { icon: LucideIcon; iconBg: string } {
  const mod = BLOCK_REGISTRY[type];
  return { icon: mod.meta.icon, iconBg: mod.meta.iconBg };
}
