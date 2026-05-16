"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { Block } from "@/lib/schema";
import type { ContainerKind, LibraryEntity } from "@/lib/library/schema";
import { Badge } from "@/components/ui/badge";
import { getBlockVisuals } from "@/lib/blockMeta";
import { cn } from "@/lib/utils";
import { entityTitle } from "./entityTitle";

const CONTAINER_COLOR: Record<ContainerKind, string> = {
  section: "bg-primary text-primary-foreground",
  subsection: "bg-info text-white",
  unit: "bg-success text-white",
};

export function EntityRow({
  entity, selected, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onClick, onDelete,
}: {
  entity: LibraryEntity;
  selected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const vis = entity.kind === "xblock" ? getBlockVisuals(entity.block.type as Block["type"]) : null;
  const Icon = vis?.icon;
  const iconBg = vis?.iconBg ?? "";
  return (
    <li
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        selected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-default-100",
      )}
      onClick={onClick}
    >
      {entity.kind === "container" ? (
        <span className={cn("grid size-6 shrink-0 place-items-center rounded text-[10px] font-semibold uppercase", CONTAINER_COLOR[entity.containerKind])}>
          {entity.containerKind.charAt(0)}
        </span>
      ) : (
        Icon && (
          <span className={cn("grid size-6 shrink-0 place-items-center rounded text-white", iconBg)}>
            <Icon size={12} />
          </span>
        )
      )}
      <span className="flex-1 truncate">{entityTitle(entity)}</span>
      {entity.kind === "container" && (
        <Badge color="default" className="!h-5 !px-1.5 !text-2xs">
          {entity.containerKind}
        </Badge>
      )}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={(ev) => { ev.stopPropagation(); onMoveUp(); }}
          className="rounded p-0.5 text-default-400 hover:bg-default-100 hover:text-default-700 disabled:cursor-not-allowed disabled:opacity-30"
          title="เลื่อนขึ้น"
        >
          <ArrowUp size={11} />
        </button>
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={(ev) => { ev.stopPropagation(); onMoveDown(); }}
          className="rounded p-0.5 text-default-400 hover:bg-default-100 hover:text-default-700 disabled:cursor-not-allowed disabled:opacity-30"
          title="เลื่อนลง"
        >
          <ArrowDown size={11} />
        </button>
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
          className="rounded p-0.5 text-default-400 hover:bg-destructive/10 hover:text-destructive"
          title="ลบ entity"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </li>
  );
}
