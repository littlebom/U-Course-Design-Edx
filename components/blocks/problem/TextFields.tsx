"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProblemBlock, TextMatchMode } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TextFields({
  block, setProblem,
}: {
  block: ProblemBlock;
  setProblem: (mut: (p: ProblemBlock) => void) => void;
}) {
  const answers = block.textAnswers ?? [];
  const matchMode = block.textMatchMode ?? "exact";

  return (
    <>
      <div className="space-y-1.5">
        <Label>Match Mode</Label>
        <select
          value={matchMode}
          onChange={(e) => setProblem((p) => (p.textMatchMode = e.target.value as TextMatchMode))}
          className="w-full rounded-md border border-default-200 bg-background px-3 py-2 text-sm"
        >
          <option value="exact">Exact — ตรงตามตัวอักษรเป๊ะ</option>
          <option value="ci">Case-insensitive — ไม่แยกใหญ่/เล็ก</option>
          <option value="regex">Regex — รับ regular expression</option>
          <option value="ci-regex">Regex + CI — regex ไม่แยกใหญ่/เล็ก</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>คำตอบที่ถูก (เพิ่มได้หลายคำตอบ)</Label>
        <div className="space-y-1.5">
          {answers.map((ans, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-center text-xs text-default-400">#{i + 1}</span>
              <Input
                value={ans}
                onChange={(e) => setProblem((p) => {
                  if (!p.textAnswers) p.textAnswers = [];
                  p.textAnswers[i] = e.target.value;
                })}
                placeholder={matchMode.includes("regex") ? "^Bangkok$|^กรุงเทพ$" : "Bangkok"}
                className="flex-1 !font-mono"
              />
              {answers.length > 1 && (
                <Button
                  size="icon" variant="ghost" color="destructive" className="!h-7 !w-7"
                  onClick={() => setProblem((p) => { p.textAnswers?.splice(i, 1); })}
                  title="ลบ"
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm" variant="outline" color="primary"
            onClick={() => setProblem((p) => {
              if (!p.textAnswers) p.textAnswers = [];
              p.textAnswers.push("");
            })}
          >
            <Plus size={12} className="me-1" /> เพิ่มคำตอบ
          </Button>
        </div>
      </div>
    </>
  );
}
