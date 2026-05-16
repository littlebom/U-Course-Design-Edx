"use client";

import type { ProblemBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BlockUpdateFn } from "./types";
import { ChoiceList } from "./problem/ChoiceList";
import { NumericalFields } from "./problem/NumericalFields";
import { TextFields } from "./problem/TextFields";
import { AdvancedSettings } from "./problem/AdvancedSettings";

type ProblemKind = ProblemBlock["problemType"];

// Top-level Problem editor. Picks the right field component per problemType
// and seeds the kind-specific fields when the user switches type so we don't
// flash validation errors. Kind-specific UIs live in ./problem/*.
export function ProblemFields({ block, update }: { block: ProblemBlock; update: BlockUpdateFn }) {
  const setProblem = (mut: (p: ProblemBlock) => void) => update((b) => mut(b as ProblemBlock));

  const setKind = (kind: ProblemKind) => setProblem((p) => {
    p.problemType = kind;
    if (kind === "multiplechoice" || kind === "checkbox" || kind === "dropdown") {
      if (!p.choices || p.choices.length < 2) {
        p.choices = [
          { text: "ตัวเลือก 1", correct: true },
          { text: "ตัวเลือก 2", correct: false },
        ];
      }
    } else if (kind === "numerical") {
      if (p.numericalAnswer == null) p.numericalAnswer = 0;
      if (p.numericalTolerance == null) p.numericalTolerance = "0";
    } else if (kind === "text") {
      if (!p.textAnswers || p.textAnswers.length === 0) p.textAnswers = [""];
      if (!p.textMatchMode) p.textMatchMode = "exact";
    }
  });

  const isChoiceBased = block.problemType === "multiplechoice"
    || block.problemType === "checkbox"
    || block.problemType === "dropdown";

  return (
    <>
      <div className="space-y-1.5">
        <Label>ประเภท</Label>
        <Tabs value={block.problemType} onValueChange={(v) => setKind(v as ProblemKind)}>
          <TabsList className="bg-default-100 !gap-1 !p-1 flex-wrap">
            <TabsTrigger value="multiplechoice" className="!px-3 !text-xs">เลือก 1 ข้อ</TabsTrigger>
            <TabsTrigger value="checkbox" className="!px-3 !text-xs">เลือกหลายข้อ</TabsTrigger>
            <TabsTrigger value="dropdown" className="!px-3 !text-xs">Dropdown</TabsTrigger>
            <TabsTrigger value="numerical" className="!px-3 !text-xs">ตัวเลข</TabsTrigger>
            <TabsTrigger value="text" className="!px-3 !text-xs">ข้อความ</TabsTrigger>
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

      {isChoiceBased && <ChoiceList block={block} setProblem={setProblem} />}
      {block.problemType === "numerical" && <NumericalFields block={block} setProblem={setProblem} />}
      {block.problemType === "text" && <TextFields block={block} setProblem={setProblem} />}

      <div className="space-y-1.5">
        <Label>คำอธิบายเฉลย (Solution)</Label>
        <Textarea
          rows={2}
          value={block.explanation ?? ""}
          onChange={(e) => setProblem((p) => (p.explanation = e.target.value || undefined))}
        />
      </div>

      <AdvancedSettings block={block} setProblem={setProblem} />
    </>
  );
}
