"use client";

import type { UnknownBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function UnknownView({ block }: { block: UnknownBlock }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-semibold">Unknown Block: <span className="font-mono">{block.blockType}</span></p>
        <p className="mt-1 text-xs text-slate-500">
          block นี้ไม่รองรับการแก้ไข — จะ export กลับในรูปแบบ XML เดิม
        </p>
      </div>
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
