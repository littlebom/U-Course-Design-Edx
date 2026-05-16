"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProblemBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared by Multiple Choice (single correct), Checkbox (multi-correct), and
// Dropdown. The only difference is the input type (radio vs checkbox) and
// dropdown skipping per-option hints (OLX doesn't support <choicehint> there).
export function ChoiceList({
  block, setProblem,
}: {
  block: ProblemBlock;
  setProblem: (mut: (p: ProblemBlock) => void) => void;
}) {
  const choices = block.choices ?? [];
  const isSingle = block.problemType === "multiplechoice" || block.problemType === "dropdown";
  const label = block.problemType === "dropdown" ? "ตัวเลือก (Dropdown)" : "ตัวเลือก";
  const supportsHint = block.problemType !== "dropdown";

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="space-y-1.5">
        {choices.map((c, i) => (
          <div
            key={i}
            className={cn(
              "space-y-1 rounded-md border bg-card px-2 py-1.5 transition-colors",
              c.correct ? "border-success/60 ring-1 ring-success/30" : "border-default-200",
            )}
          >
            <div className="flex items-center gap-2">
              <input
                type={isSingle ? "radio" : "checkbox"}
                name="correct"
                checked={c.correct}
                onChange={(e) =>
                  setProblem((p) => {
                    if (!p.choices) p.choices = [];
                    if (isSingle) p.choices.forEach((x, j) => (x.correct = j === i));
                    else p.choices[i].correct = e.target.checked;
                  })
                }
                className="size-4 accent-success"
              />
              <input
                className="flex-1 bg-transparent text-sm outline-hidden"
                value={c.text}
                onChange={(e) => setProblem((p) => { if (p.choices) p.choices[i].text = e.target.value; })}
              />
              <Button
                size="icon" variant="ghost" color="destructive" className="!h-7 !w-7"
                onClick={() => setProblem((p) => { p.choices?.splice(i, 1); })}
                title="ลบ"
              >
                <Trash2 size={13} />
              </Button>
            </div>
            {supportsHint && (
              <input
                className="w-full rounded border border-dashed border-default-200 bg-default-50 px-2 py-1 text-xs italic outline-hidden focus:border-primary focus:bg-card"
                placeholder="(ไม่บังคับ) Feedback แสดงเมื่อเลือกข้อนี้"
                value={c.hint ?? ""}
                onChange={(e) => setProblem((p) => {
                  if (!p.choices) return;
                  const v = e.target.value;
                  p.choices[i].hint = v || undefined;
                })}
              />
            )}
          </div>
        ))}
        <Button
          size="sm" variant="outline" color="primary"
          onClick={() => setProblem((p) => {
            if (!p.choices) p.choices = [];
            p.choices.push({ text: "ตัวเลือกใหม่", correct: false });
          })}
        >
          <Plus size={12} className="me-1" /> เพิ่มตัวเลือก
        </Button>
      </div>
    </div>
  );
}
