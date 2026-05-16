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

          <div className="space-y-3 border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-default-400">
              Metadata (Ulmo ต้องการให้ไม่ว่าง)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Created By (ชื่อผู้สร้าง)</Label>
                <Input
                  value={library.meta.createdBy}
                  onChange={(e) => onChange((l) => { l.meta.createdBy = e.target.value; })}
                  placeholder="olx-builder"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Created By Email</Label>
                <Input
                  type="email"
                  value={library.meta.createdByEmail}
                  onChange={(e) => onChange((l) => { l.meta.createdByEmail = e.target.value; })}
                  placeholder="olx-builder@local"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Origin Server</Label>
                <Input
                  value={library.meta.originServer}
                  onChange={(e) => onChange((l) => { l.meta.originServer = e.target.value; })}
                  placeholder="studio.example.com"
                />
                <p className="text-xs text-default-400">URL ของ Studio ที่ใช้สร้าง — ถ้าว่างจะใช้ <code>olx-builder.local</code> ตอน export</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-default-500">
              <div>
                <span className="text-default-400">Format Version: </span>
                <span className="font-mono">{library.meta.formatVersion}</span>
              </div>
              <div>
                <span className="text-default-400">Created At: </span>
                <span className="font-mono">{library.meta.createdAt?.slice(0, 19).replace("T", " ") ?? "—"}</span>
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
