"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProblemBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Collapsible advanced settings — weight, max attempts, shuffle, partial
// credit, show-answer mode, demand hints. Studio compatibility surface area.
export function AdvancedSettings({
  block, setProblem,
}: {
  block: ProblemBlock;
  setProblem: (mut: (p: ProblemBlock) => void) => void;
}) {
  const hasShuffle = block.problemType === "multiplechoice" || block.problemType === "checkbox";
  const hasPartialCredit = block.problemType === "checkbox";
  const demandHints = block.demandHints ?? [];

  return (
    <details className="rounded-md border border-default-200 bg-default-50 px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none font-medium text-default-700">
        การตั้งค่าเพิ่มเติม (Studio compatibility)
      </summary>
      <div className="mt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>น้ำหนักคะแนน (Weight)</Label>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={block.weight ?? 1}
              onChange={(e) => setProblem((p) => (p.weight = Number(e.target.value)))}
            />
            <p className="text-xs text-default-400">คะแนนที่ข้อนี้จะนับ (default = 1.0)</p>
          </div>
          <div className="space-y-1.5">
            <Label>Max Attempts</Label>
            <Input
              type="number"
              min={1}
              value={block.maxAttempts ?? 1}
              onChange={(e) => setProblem((p) => (p.maxAttempts = Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
        </div>

        {hasShuffle && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={block.shuffle ?? false}
              onChange={(e) => setProblem((p) => (p.shuffle = e.target.checked || undefined))}
              className="size-4 accent-primary"
            />
            <span className="text-sm">สลับลำดับตัวเลือก (Shuffle choices)</span>
          </label>
        )}

        {hasPartialCredit && (
          <div className="space-y-1.5">
            <Label>Partial Credit (เฉพาะ Multi-Select)</Label>
            <select
              value={block.partialCredit ?? ""}
              onChange={(e) => setProblem((p) => {
                const v = e.target.value;
                p.partialCredit = (v === "EDC" || v === "halves") ? v : undefined;
              })}
              className="w-full rounded-md border border-default-200 bg-background px-3 py-2 text-sm"
            >
              <option value="">ไม่ใช้ — ตอบถูกครบเท่านั้นได้คะแนน</option>
              <option value="EDC">EDC — Every Decision Counts (ทุกตัวเลือกนับ)</option>
              <option value="halves">halves — ตอบถูกบางส่วนได้ครึ่งคะแนน</option>
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Show Answer</Label>
          <select
            value={block.showAnswer ?? "closed"}
            onChange={(e) => setProblem((p) => (p.showAnswer = e.target.value as ProblemBlock["showAnswer"]))}
            className="w-full rounded-md border border-default-200 bg-background px-3 py-2 text-sm"
          >
            <option value="always">always — แสดงตลอด</option>
            <option value="answered">answered — หลังตอบ</option>
            <option value="attempted">attempted — หลังลอง</option>
            <option value="closed">closed — หลังปิดส่ง</option>
            <option value="finished">finished — หลังตอบครบ attempts</option>
            <option value="past_due">past_due — หลังวัน due</option>
            <option value="correct_or_past_due">correct_or_past_due</option>
            <option value="never">never — ไม่แสดง</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Demand Hints (กดปุ่ม &quot;Hint&quot; เพื่อดูทีละข้อ)</Label>
          {demandHints.length === 0 && (
            <p className="text-xs text-default-400">ยังไม่มี hint — เพิ่มได้เพื่อช่วย scaffolding ผู้เรียน</p>
          )}
          {demandHints.map((h, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2 w-6 shrink-0 text-center text-xs text-default-400">#{i + 1}</span>
              <Textarea
                rows={2}
                value={h}
                onChange={(e) => setProblem((p) => {
                  if (!p.demandHints) p.demandHints = [];
                  p.demandHints[i] = e.target.value;
                })}
                placeholder="เช่น ลองคิดถึงคุณสมบัติของน้ำ"
                className="flex-1 !text-sm"
              />
              <Button
                size="icon" variant="ghost" color="destructive" className="!h-7 !w-7"
                onClick={() => setProblem((p) => { p.demandHints?.splice(i, 1); })}
                title="ลบ hint"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
          <Button
            size="sm" variant="outline" color="primary"
            onClick={() => setProblem((p) => {
              if (!p.demandHints) p.demandHints = [];
              p.demandHints.push("");
            })}
          >
            <Plus size={12} className="me-1" /> เพิ่ม Hint
          </Button>
        </div>
      </div>
    </details>
  );
}
