"use client";

import { useState } from "react";
import { Pencil, HelpCircle } from "lucide-react";
import type { ProblemBlock } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import type { BlockUpdateFn } from "./types";
import { ProblemEditorModal } from "./problem/ProblemEditorModal";

const TYPE_LABEL: Record<ProblemBlock["problemType"], string> = {
  multiplechoice: "เลือก 1 ข้อ",
  checkbox: "เลือกหลายข้อ",
  dropdown: "Dropdown",
  numerical: "ตัวเลข",
  text: "ข้อความ",
};

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function answerSummary(block: ProblemBlock): string {
  if (block.problemType === "numerical") {
    return `คำตอบ = ${block.numericalAnswer ?? "-"}${block.numericalTolerance && block.numericalTolerance !== "0" ? ` ± ${block.numericalTolerance}` : ""}`;
  }
  if (block.problemType === "text") {
    const n = (block.textAnswers ?? []).filter((a) => a.trim()).length;
    return `${n} คำตอบที่ยอมรับ`;
  }
  const choices = block.choices ?? [];
  const correct = choices.filter((c) => c.correct).length;
  return `${choices.length} ตัวเลือก · ถูก ${correct}`;
}

// Inline problem "card" shown in the block editor panel: a compact summary plus
// an Edit button that opens the full-screen Open edX–style ProblemEditorModal.
// All real editing happens in the modal (same data + export path).
export function ProblemFields({ block, update }: { block: ProblemBlock; update: BlockUpdateFn }) {
  const [open, setOpen] = useState(false);
  const setProblem = (mut: (p: ProblemBlock) => void) => update((b) => mut(b as ProblemBlock));

  const preview = stripTags(block.question) || "(ยังไม่มีคำถาม)";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-default-200 bg-default-50 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <HelpCircle size={12} /> {TYPE_LABEL[block.problemType]}
          </span>
          <span className="text-xs text-default-500">{answerSummary(block)}</span>
          <span className="text-xs text-default-400">· Weight {block.weight ?? 1}</span>
          <span className="text-xs text-default-400">· Attempts {block.maxAttempts ?? 1}</span>
        </div>
        <p className="line-clamp-3 text-sm text-default-700">{preview}</p>
      </div>

      <Button color="primary" className="w-full" onClick={() => setOpen(true)}>
        <Pencil size={14} className="me-1.5" /> แก้ไข Problem (Open edX)
      </Button>

      {open && (
        <ProblemEditorModal block={block} setProblem={setProblem} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
