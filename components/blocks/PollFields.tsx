"use client";

import { Plus, Trash2 } from "lucide-react";
import type { PollBlock, PollAnswer } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BlockUpdateFn } from "./types";

export function PollFields({ block, update }: { block: PollBlock; update: BlockUpdateFn }) {
  const set = (fn: (b: PollBlock) => void) => update((b) => fn(b as PollBlock));
  const setAnswer = (i: number, fn: (a: PollAnswer) => void) => set((b) => fn(b.answers[i]));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>คำถาม (Question)</Label>
        <Textarea
          rows={2}
          value={block.question}
          onChange={(e) => set((b) => (b.question = e.target.value))}
          placeholder="พิมพ์คำถามที่ต้องการถาม..."
        />
      </div>

      <div className="space-y-2">
        <Label>ตัวเลือกคำตอบ</Label>
        {block.answers.map((ans, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={ans.id}
              onChange={(e) => setAnswer(i, (a) => (a.id = e.target.value.toUpperCase()))}
              className="w-16 !font-mono text-center"
              placeholder="ID"
              maxLength={4}
            />
            <Input
              value={ans.label}
              onChange={(e) => setAnswer(i, (a) => (a.label = e.target.value))}
              placeholder={`ตัวเลือก ${i + 1}`}
              className="flex-1"
            />
            {block.answers.length > 2 && (
              <button
                type="button"
                onClick={() => set((b) => b.answers.splice(i, 1))}
                className="rounded p-1 text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => set((b) => b.answers.push({ id: String.fromCharCode(65 + b.answers.length), label: "", img: "" }))}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-default-300 px-3 py-1.5 text-xs text-default-500 hover:border-primary hover:text-primary"
        >
          <Plus size={12} /> เพิ่มตัวเลือก
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>ข้อความ Feedback (แสดงหลังตอบ)</Label>
        <Input
          value={block.feedback}
          onChange={(e) => set((b) => (b.feedback = e.target.value))}
          placeholder="(ไม่บังคับ)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>จำนวนครั้งที่ตอบได้</Label>
          <Input
            type="number"
            min={1}
            value={block.maxSubmissions}
            onChange={(e) => set((b) => (b.maxSubmissions = Number(e.target.value) || 1))}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="poll-private"
            checked={block.privateResults}
            onChange={(e) => set((b) => (b.privateResults = e.target.checked))}
          />
          <label htmlFor="poll-private" className="text-sm">ซ่อนผลโหวต (Private results)</label>
        </div>
      </div>
    </div>
  );
}
