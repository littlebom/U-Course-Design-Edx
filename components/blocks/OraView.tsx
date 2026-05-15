"use client";

import type { OraBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OraView({ block }: { block: OraBlock }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        <p className="font-semibold">Open Response Assessment (Pass-through)</p>
        <p className="mt-1 text-xs text-rose-600">
          block นี้ถูก import มาจาก Open edX และจะถูก export กลับไปในรูปแบบ XML เดิม ไม่รองรับการแก้ไขใน Builder
        </p>
      </div>

      {block.assessmentTypes.length > 0 && (
        <div className="space-y-1.5">
          <Label>ประเภทการประเมิน</Label>
          <div className="flex flex-wrap gap-1.5">
            {block.assessmentTypes.map((t) => (
              <span key={t} className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {(block.submissionStart || block.submissionDue) && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {block.submissionStart && (
            <div className="space-y-0.5">
              <Label>เปิดรับส่งงาน</Label>
              <p className="font-mono text-default-600">{block.submissionStart}</p>
            </div>
          )}
          {block.submissionDue && (
            <div className="space-y-0.5">
              <Label>ปิดรับส่งงาน</Label>
              <p className="font-mono text-default-600">{block.submissionDue}</p>
            </div>
          )}
        </div>
      )}

      {block.hasFileUpload && (
        <p className="text-xs text-default-500">📎 กำหนดให้นักศึกษาแนบไฟล์</p>
      )}

      <div className="space-y-1.5">
        <Label>Raw XML (read-only)</Label>
        <Textarea
          rows={8}
          readOnly
          className="!font-mono !text-xs opacity-60"
          value={block.rawXml}
        />
      </div>
    </div>
  );
}
