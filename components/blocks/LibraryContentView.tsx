"use client";

import type { LibraryContentBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LibraryContentView({ block }: { block: LibraryContentBlock }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        <p className="font-semibold">Library Content (Pass-through)</p>
        <p className="mt-1 text-xs text-teal-600">
          block นี้ดึงโจทย์แบบสุ่มจาก Content Library — จะ export กลับในรูปแบบ XML เดิม
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Source Library ID</Label>
        <p className="rounded-md border border-default-200 bg-default-50 px-3 py-2 font-mono text-xs text-default-700">
          {block.sourceLibraryId || "(ไม่ระบุ)"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>จำนวนข้อที่สุ่ม (max_count)</Label>
        <p className="text-sm font-semibold">{block.maxCount} ข้อ</p>
      </div>

      <div className="space-y-1.5">
        <Label>Raw XML (read-only)</Label>
        <Textarea
          rows={6}
          readOnly
          className="!font-mono !text-xs opacity-60"
          value={block.rawXml}
        />
      </div>
    </div>
  );
}
