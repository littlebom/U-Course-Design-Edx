"use client";

import * as React from "react";
import { Wrench, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CleanAction } from "@/lib/clean";

type Tone = "success" | "destructive" | "warning";

function ActionGroup({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: CleanAction[];
  icon: React.ReactNode;
  tone: Tone;
}) {
  if (items.length === 0) return null;
  const toneCls =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-warning";
  return (
    <div>
      <div
        className={cn(
          "mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
          toneCls,
        )}
      >
        {icon} {title} ({items.length})
      </div>
      <ul className="space-y-1">
        {items.map((a, i) => (
          <li key={i} className="rounded-md bg-default-100 px-2.5 py-1.5 text-xs">
            <div className="font-medium text-default-700">{a.where}</div>
            <div className="text-default-500">{a.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CleanupDialog({
  open,
  onOpenChange,
  actions,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actions: CleanAction[];
  onConfirm: () => void;
}) {
  const fixed = actions.filter((a) => a.type === "fixed");
  const removed = actions.filter((a) => a.type === "removed");
  const skipped = actions.filter((a) => a.type === "skipped");
  const actionable = fixed.length + removed.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>ทำความสะอาดเนื้อหา</DialogTitle>
          <DialogDescription>
            ตรวจพบ {actions.length} รายการ — ระบบจะ
            <span className="font-medium text-success"> แก้ {fixed.length}</span>,
            <span className="font-medium text-destructive"> ลบ {removed.length}</span>
            {skipped.length > 0 && (
              <>
                , <span className="font-medium text-warning">ต้องแก้เอง {skipped.length}</span>
              </>
            )}
            . ยังไม่มีการเปลี่ยนแปลงใดๆ จนกว่าจะกดยืนยัน
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {actions.length === 0 && (
            <div className="text-sm text-default-500">ไม่พบปัญหาที่ต้องจัดการ 🎉</div>
          )}
          <ActionGroup title="จะแก้อัตโนมัติ" items={fixed} icon={<Wrench size={13} />} tone="success" />
          <ActionGroup title="จะลบทิ้ง" items={removed} icon={<Trash2 size={13} />} tone="destructive" />
          <ActionGroup
            title="ต้องแก้เอง (ไม่แตะ)"
            items={skipped}
            icon={<AlertTriangle size={13} />}
            tone="warning"
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button color="primary" disabled={actionable === 0} onClick={onConfirm}>
            ทำความสะอาด ({actionable})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
