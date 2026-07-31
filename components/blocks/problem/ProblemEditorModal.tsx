"use client";

import { useEffect, type ReactNode } from "react";
import {
  X, HelpCircle, CircleDot, ListChecks, ChevronDownSquare, Hash, Type,
  Target, Eye, Shuffle, Lightbulb, Plus, Trash2, SlidersHorizontal,
} from "lucide-react";
import type { ProblemBlock } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChoiceList } from "./ChoiceList";
import { NumericalFields } from "./NumericalFields";
import { TextFields } from "./TextFields";

type ProblemKind = ProblemBlock["problemType"];

const TYPES: { kind: ProblemKind; label: string; desc: string; icon: typeof CircleDot }[] = [
  { kind: "multiplechoice", label: "เลือก 1 ข้อ", desc: "Single select", icon: CircleDot },
  { kind: "checkbox", label: "เลือกหลายข้อ", desc: "Multi select", icon: ListChecks },
  { kind: "dropdown", label: "Dropdown", desc: "เมนูดรอปดาวน์", icon: ChevronDownSquare },
  { kind: "numerical", label: "ตัวเลข", desc: "Numerical", icon: Hash },
  { kind: "text", label: "ข้อความ", desc: "Text input", icon: Type },
];

// Seed kind-specific fields when switching type so we don't flash validation errors.
function applyKind(p: ProblemBlock, kind: ProblemKind) {
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
}

function SettingsCard({
  icon, title, children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-default-200 bg-card p-3">
      <div className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-default-700">
        <span className="text-default-500">{icon}</span> {title}
      </div>
      {children}
    </section>
  );
}

// Full-screen, two-pane problem editor styled after the Open edX Studio problem
// editor: content (type / question / answers / solution) on the left, settings
// cards on the right. Reuses the same field components as the inline editor, so
// data + export behaviour are identical — this is a layout/GUI layer only.
export function ProblemEditorModal({
  block, setProblem, onClose,
}: {
  block: ProblemBlock;
  setProblem: (mut: (p: ProblemBlock) => void) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isChoiceBased = block.problemType === "multiplechoice"
    || block.problemType === "checkbox"
    || block.problemType === "dropdown";
  const hasShuffle = block.problemType === "multiplechoice" || block.problemType === "checkbox";
  const hasPartialCredit = block.problemType === "checkbox";
  const demandHints = block.demandHints ?? [];
  const typeLabel = TYPES.find((t) => t.kind === block.problemType)?.label ?? "Problem";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-default-200 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-default-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-primary" />
            <span className="font-medium">แก้ไข Problem</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {typeLabel}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="!h-8 !w-8" onClick={onClose} aria-label="ปิด">
            <X size={16} />
          </Button>
        </div>

        {/* Body: two-pane */}
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1.6fr_1fr]">
          {/* Left — content */}
          <div className="min-w-0 space-y-5 overflow-auto p-5">
            {/* Type picker cards */}
            <div className="space-y-1.5">
              <Label>ประเภทคำถาม</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = block.problemType === t.kind;
                  return (
                    <button
                      key={t.kind}
                      type="button"
                      onClick={() => setProblem((p) => applyKind(p, t.kind))}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-start transition-colors",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-default-200 bg-card hover:border-default-300 hover:bg-default-50",
                      )}
                    >
                      <Icon size={16} className={active ? "text-primary" : "text-default-500"} />
                      <span className="text-xs font-medium leading-tight">{t.label}</span>
                      <span className="text-[10px] text-default-400">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question */}
            <div className="space-y-1.5">
              <Label>คำถาม (HTML)</Label>
              <Textarea
                rows={4}
                className="!font-mono !text-xs"
                value={block.question}
                onChange={(e) => setProblem((p) => (p.question = e.target.value))}
              />
            </div>

            {/* Answers */}
            <div className="space-y-1.5">
              <Label>คำตอบ</Label>
              {isChoiceBased && <ChoiceList block={block} setProblem={setProblem} />}
              {block.problemType === "numerical" && <NumericalFields block={block} setProblem={setProblem} />}
              {block.problemType === "text" && <TextFields block={block} setProblem={setProblem} />}
            </div>

            {/* Solution */}
            <div className="space-y-1.5">
              <Label>คำอธิบายเฉลย (Solution)</Label>
              <Textarea
                rows={2}
                value={block.explanation ?? ""}
                onChange={(e) => setProblem((p) => (p.explanation = e.target.value || undefined))}
              />
            </div>
          </div>

          {/* Right — settings */}
          <div className="min-w-0 space-y-3 overflow-auto border-t border-default-200 bg-default-50 p-4 md:border-s md:border-t-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-default-400">
              การตั้งค่า (Settings)
            </div>

            <SettingsCard icon={<Target size={15} />} title="Scoring">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Maximum Attempts</Label>
                  <Input
                    type="number" min={1}
                    value={block.maxAttempts ?? 1}
                    onChange={(e) => setProblem((p) => (p.maxAttempts = Math.max(1, Number(e.target.value) || 1)))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">น้ำหนักคะแนน (Weight)</Label>
                  <Input
                    type="number" min={0} step="0.5"
                    value={block.weight ?? 1}
                    onChange={(e) => setProblem((p) => (p.weight = Number(e.target.value)))}
                  />
                  <p className="text-[10px] text-default-400">คะแนนที่ข้อนี้จะนับ (default = 1.0)</p>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard icon={<Eye size={15} />} title="Show Answer">
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
            </SettingsCard>

            {(hasShuffle || hasPartialCredit) && (
              <SettingsCard icon={<Shuffle size={15} />} title="ตัวเลือก (Options)">
                <div className="space-y-3">
                  {hasShuffle && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={block.shuffle ?? false}
                        onChange={(e) => setProblem((p) => (p.shuffle = e.target.checked || undefined))}
                        className="size-4 accent-primary"
                      />
                      <span className="text-sm">สลับลำดับตัวเลือก (Shuffle)</span>
                    </label>
                  )}
                  {hasPartialCredit && (
                    <div className="space-y-1">
                      <Label className="text-xs">Partial Credit</Label>
                      <select
                        value={block.partialCredit ?? ""}
                        onChange={(e) => setProblem((p) => {
                          const v = e.target.value;
                          p.partialCredit = (v === "EDC" || v === "halves") ? v : undefined;
                        })}
                        className="w-full rounded-md border border-default-200 bg-background px-3 py-2 text-sm"
                      >
                        <option value="">ไม่ใช้ — ตอบถูกครบเท่านั้น</option>
                        <option value="EDC">EDC — Every Decision Counts</option>
                        <option value="halves">halves — ถูกบางส่วนได้ครึ่ง</option>
                      </select>
                    </div>
                  )}
                </div>
              </SettingsCard>
            )}

            <SettingsCard icon={<Lightbulb size={15} />} title="Demand Hints">
              <div className="space-y-2">
                {demandHints.length === 0 && (
                  <p className="text-[11px] text-default-400">กดปุ่ม &quot;Hint&quot; ตอนทำข้อสอบเพื่อดูทีละข้อ</p>
                )}
                {demandHints.map((h, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="mt-2 w-4 shrink-0 text-center text-[10px] text-default-400">{i + 1}</span>
                    <Textarea
                      rows={2}
                      value={h}
                      onChange={(e) => setProblem((p) => {
                        if (!p.demandHints) p.demandHints = [];
                        p.demandHints[i] = e.target.value;
                      })}
                      placeholder="เช่น ลองคิดถึงคุณสมบัติของน้ำ"
                      className="flex-1 !text-xs"
                    />
                    <Button
                      size="icon" variant="ghost" color="destructive" className="!h-7 !w-7"
                      onClick={() => setProblem((p) => { p.demandHints?.splice(i, 1); })}
                      aria-label="ลบ hint"
                    >
                      <Trash2 size={12} />
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
            </SettingsCard>

            <p className="flex items-center gap-1 px-1 text-[10px] text-default-400">
              <SlidersHorizontal size={11} /> คุณสมบัติตรงกับ Open edX (Weight, Attempts, Show Answer …)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-default-200 bg-default-50 px-5 py-3">
          <span className="text-xs text-default-400">บันทึกอัตโนมัติ</span>
          <Button color="primary" size="sm" onClick={onClose}>เสร็จสิ้น</Button>
        </div>
      </div>
    </div>
  );
}
