"use client";

import type { Block } from "@/lib/schema";
import { getBlockMeta } from "@/lib/blockMeta";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  block: Block;
  /** When provided, renders the displayName as an editable Input next to the icon
   *  instead of the static type-title. */
  onRename?: (value: string) => void;
};

export function BlockHeader({ block, onRename }: Props) {
  const meta = getBlockMeta(block);
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-md text-white shadow-base",
          meta.iconBg,
        )}
        title={meta.title}
      >
        <Icon size={16} />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onRename ? (
          <Input
            value={block.displayName}
            onChange={(e) => onRename(e.target.value)}
            placeholder={meta.title}
            className="!h-9 flex-1 !text-base !font-semibold"
          />
        ) : (
          <div className="text-base font-semibold tracking-tight">{meta.title}</div>
        )}
        <Badge color={meta.badgeColor} className="shrink-0">
          {meta.badgeLabel}
        </Badge>
      </div>
    </div>
  );
}
