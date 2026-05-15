"use client";

import type { Block } from "@/lib/schema";
import { getBlockMeta } from "@/lib/blockMeta";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function BlockHeader({ block }: { block: Block }) {
  const meta = getBlockMeta(block);
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-md text-white shadow-base",
          meta.iconBg,
        )}
      >
        <Icon size={16} />
      </span>
      <div>
        <div className="text-base font-semibold tracking-tight">{meta.title}</div>
        <Badge color={meta.badgeColor} className="mt-0.5">
          {meta.badgeLabel}
        </Badge>
      </div>
    </div>
  );
}
