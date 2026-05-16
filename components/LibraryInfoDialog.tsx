"use client";

import type { Library } from "@/lib/library/schema";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  library: Library;
  onChange: (fn: (l: Library) => void) => void;
  onClose: () => void;
};

export function LibraryInfoDialog({ open, library, onChange, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>ข้อมูล Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>ชื่อ Library (Display Name)</Label>
            <Input
              value={library.learningPackage.title}
              onChange={(e) => onChange((l) => { l.learningPackage.title = e.target.value; })}
              placeholder="เช่น Welcome to Open edX"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Key</Label>
            <Input
              className="!font-mono !text-xs"
              value={library.learningPackage.key}
              onChange={(e) => onChange((l) => { l.learningPackage.key = e.target.value; })}
              placeholder="lib:Org:Code"
            />
            <p className="text-xs text-default-400">
              ใช้เป็น identifier ของ Library ใน Open edX (รูปแบบ <code>lib:Org:Code</code>)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>คำอธิบาย</Label>
            <Textarea
              rows={3}
              value={library.learningPackage.description}
              onChange={(e) => onChange((l) => { l.learningPackage.description = e.target.value; })}
              placeholder="คำอธิบายสั้น ๆ ของ Library นี้"
            />
          </div>

          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-default-400">
              Metadata (read-only)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <Label className="!text-default-400">Format Version</Label>
                <p className="font-mono">{library.meta.formatVersion}</p>
              </div>
              <div>
                <Label className="!text-default-400">Origin Server</Label>
                <p className="truncate font-mono">{library.meta.originServer || "—"}</p>
              </div>
              <div>
                <Label className="!text-default-400">Created By</Label>
                <p className="truncate">{library.meta.createdBy || "—"}</p>
              </div>
              <div>
                <Label className="!text-default-400">Created At</Label>
                <p className="font-mono">{library.meta.createdAt?.slice(0, 19).replace("T", " ") ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" onClick={onClose}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
