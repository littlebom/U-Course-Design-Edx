"use client";

import type { ProblemBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function NumericalFields({
  block, setProblem,
}: {
  block: ProblemBlock;
  setProblem: (mut: (p: ProblemBlock) => void) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>คำตอบ (ตัวเลข)</Label>
        <Input
          type="number"
          step="any"
          value={block.numericalAnswer ?? 0}
          onChange={(e) => setProblem((p) => (p.numericalAnswer = Number(e.target.value)))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Tolerance</Label>
        <Input
          value={block.numericalTolerance ?? "0"}
          onChange={(e) => setProblem((p) => (p.numericalTolerance = e.target.value))}
          placeholder="0.01 หรือ 2%"
          className="!font-mono"
        />
        <p className="text-xs text-default-400">รับเป็นค่าคงที่ (เช่น <code>0.01</code>) หรือ % (เช่น <code>2%</code>)</p>
      </div>
    </div>
  );
}
