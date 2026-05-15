"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProblemBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { BlockUpdateFn } from "./types";

export function ProblemFields({ block, update }: { block: ProblemBlock; update: BlockUpdateFn }) {
  const setProblem = (mut: (p: ProblemBlock) => void) => update((b) => mut(b as ProblemBlock));

  return (
    <>
      <div className="space-y-1.5">
        <Label>ประเภท</Label>
        <Tabs
          value={block.problemType}
          onValueChange={(v) => setProblem((p) => (p.problemType = v as ProblemBlock["problemType"]))}
        >
          <TabsList className="bg-default-100 !gap-1 !p-1">
            <TabsTrigger value="multiplechoice" className="!px-3">เลือก 1 ข้อ</TabsTrigger>
            <TabsTrigger value="checkbox" className="!px-3">เลือกหลายข้อ</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-1.5">
        <Label>คำถาม (HTML)</Label>
        <Textarea
          rows={3}
          className="!font-mono !text-xs"
          value={block.question}
          onChange={(e) => setProblem((p) => (p.question = e.target.value))}
        />
      </div>

      <div className="space-y-1.5">
        <Label>ตัวเลือก</Label>
        <div className="space-y-1.5">
          {block.choices.map((c, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 transition-colors",
                c.correct ? "border-success/60 ring-1 ring-success/30" : "border-default-200",
              )}
            >
              <input
                type={block.problemType === "multiplechoice" ? "radio" : "checkbox"}
                name="correct"
                checked={c.correct}
                onChange={(e) =>
                  setProblem((p) => {
                    if (p.problemType === "multiplechoice")
                      p.choices.forEach((x, j) => (x.correct = j === i));
                    else p.choices[i].correct = e.target.checked;
                  })
                }
                className="size-4 accent-success"
              />
              <input
                className="flex-1 bg-transparent text-sm outline-hidden"
                value={c.text}
                onChange={(e) => setProblem((p) => (p.choices[i].text = e.target.value))}
              />
              <Button
                size="icon"
                variant="ghost"
                color="destructive"
                className="!h-7 !w-7"
                onClick={() => setProblem((p) => p.choices.splice(i, 1))}
                title="ลบ"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            color="primary"
            onClick={() =>
              setProblem((p) => p.choices.push({ text: "ตัวเลือกใหม่", correct: false }))
            }
          >
            <Plus size={12} className="me-1" /> เพิ่มตัวเลือก
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>คำอธิบายเฉลย</Label>
        <Textarea
          rows={2}
          value={block.explanation ?? ""}
          onChange={(e) => setProblem((p) => (p.explanation = e.target.value || undefined))}
        />
      </div>
    </>
  );
}
