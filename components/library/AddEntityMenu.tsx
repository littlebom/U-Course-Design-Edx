"use client";

import { ChevronDown, FileText, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AddEntityKind = "section" | "subsection" | "unit" | "xblock-problem" | "xblock-html";

export function AddEntityMenu({ onAdd }: { onAdd: (kind: AddEntityKind) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="primary" size="sm">
          <Plus size={12} className="me-1" /> เพิ่ม
          <ChevronDown size={11} className="ms-1 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-default-400">
          Container
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onAdd("section")}>
          <span className="me-2 grid size-4 place-items-center rounded bg-primary text-[10px] font-semibold uppercase text-primary-foreground">S</span>
          Section
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("subsection")}>
          <span className="me-2 grid size-4 place-items-center rounded bg-info text-[10px] font-semibold uppercase text-white">S</span>
          Subsection
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("unit")}>
          <span className="me-2 grid size-4 place-items-center rounded bg-success text-[10px] font-semibold uppercase text-white">U</span>
          Unit
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-default-400">
          XBlock
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onAdd("xblock-problem")}>
          <HelpCircle size={13} className="me-2 text-warning" /> Problem
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("xblock-html")}>
          <FileText size={13} className="me-2 text-default-500" /> HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
