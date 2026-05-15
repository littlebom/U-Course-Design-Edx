"use client";

import type { DiscussionBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { BlockUpdateFn } from "./types";

export function DiscussionFields({ block, update }: { block: DiscussionBlock; update: BlockUpdateFn }) {
  const set = (fn: (b: DiscussionBlock) => void) => update((b) => fn(b as DiscussionBlock));
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>หมวดหมู่ (Discussion Category)</Label>
        <Input
          value={block.discussionCategory}
          placeholder="เช่น General, Week 1"
          onChange={(e) => set((b) => (b.discussionCategory = e.target.value))}
        />
        <p className="text-xs text-default-400">ใช้จัดกลุ่ม discussion ใน edX — ปรากฏใน Discussion tab</p>
      </div>
      <div className="space-y-1.5">
        <Label>หัวข้อ (Discussion Target)</Label>
        <Input
          value={block.discussionTarget}
          placeholder="เช่น แลกเปลี่ยนความคิดเห็นเรื่อง..."
          onChange={(e) => set((b) => (b.discussionTarget = e.target.value))}
        />
        <p className="text-xs text-default-400">ชื่อหัวข้อย่อยภายใน category (ถ้าว่างจะใช้ชื่อ block)</p>
      </div>
    </div>
  );
}
