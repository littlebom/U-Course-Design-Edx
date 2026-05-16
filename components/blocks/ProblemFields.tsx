"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProblemBlock, TextMatchMode } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { BlockUpdateFn } from "./types";

type ProblemKind = ProblemBlock["problemType"];

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

      {(block.problemType === "multiplechoice"
        || block.problemType === "checkbox"
        || block.problemType === "dropdown") && (
        <ChoiceList block={block} setProblem={setProblem} />
      )}

      {block.problemType === "numerical" && (
        <NumericalFields block={block} setProblem={setProblem} />
      )}

      {block.problemType === "text" && (
        <TextFields block={block} setProblem={setProblem} />
      )}

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

// ── Advanced settings (collapsible) — weight, shuffle, partial credit, demand hints
function AdvancedSettings({
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

// ── Choice-based: MCQ / Checkbox / Dropdown ───────────────────────────────
function ChoiceList({
  block, setProblem,
}: {
  block: ProblemBlock;
  setProblem: (mut: (p: ProblemBlock) => void) => void;
}) {
  const choices = block.choices ?? [];
  const isSingle = block.problemType === "multiplechoice" || block.problemType === "dropdown";
  const label = block.problemType === "dropdown" ? "ตัวเลือก (Dropdown)" : "ตัวเลือก";

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
            {/* Dropdown doesn't support per-option hints in OLX */}
            {block.problemType !== "dropdown" && (
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
          size="sm"
          variant="outline"
          color="primary"
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

// ── Numerical Input ───────────────────────────────────────────────────────
function NumericalFields({
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

// ── Text Input ────────────────────────────────────────────────────────────
function TextFields({
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
