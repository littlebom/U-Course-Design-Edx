"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, FileJson, FileCode2 } from "lucide-react";
import type { ProblemBlock } from "@/lib/schema";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onImport: (problems: ProblemBlock[]) => void;
  onClose: () => void;
};

// CSV covers the three choice-based types (choices column required).
const CSV_TEMPLATE = `displayName,problemType,question,choices,maxAttempts
"Q1 เลือกข้อเดียว","multiplechoice","2 + 2 = ?","3|4*|5",1
"Q2 เลือกหลายข้อ","checkbox","เลือกจำนวนเฉพาะ","2*|4|5*|9",2
"Q3 ดรอปดาวน์","dropdown","เมืองหลวงของไทย","เชียงใหม่|กรุงเทพ*|ภูเก็ต",1
`;

// JSON/XML cover all five Open edX common-problem types.
const JSON_TEMPLATE = `[
  {
    "displayName": "Q1 เลือกตอบข้อเดียว",
    "problemType": "multiplechoice",
    "question": "<p>2 + 2 = ?</p>",
    "choices": [
      { "text": "3", "correct": false },
      { "text": "4", "correct": true, "hint": "ถูกต้อง!" },
      { "text": "5", "correct": false }
    ],
    "maxAttempts": 2,
    "showAnswer": "attempted",
    "explanation": "<p>2 + 2 = 4</p>"
  },
  {
    "displayName": "Q2 เลือกได้หลายข้อ",
    "problemType": "checkbox",
    "question": "<p>ข้อใดเป็นจำนวนเฉพาะ? (เลือกได้มากกว่า 1)</p>",
    "choices": ["2*", "4", "5*", "9"],
    "shuffle": true
  },
  {
    "displayName": "Q3 ดรอปดาวน์",
    "problemType": "dropdown",
    "question": "<p>เมืองหลวงของประเทศไทยคือข้อใด?</p>",
    "choices": ["เชียงใหม่", "กรุงเทพมหานคร*", "ภูเก็ต"]
  },
  {
    "displayName": "Q4 ตอบเป็นตัวเลข",
    "problemType": "numerical",
    "question": "<p>ค่าประมาณของ π (ทศนิยม 2 ตำแหน่ง)?</p>",
    "numericalAnswer": 3.14,
    "numericalTolerance": "0.01"
  },
  {
    "displayName": "Q5 ตอบเป็นข้อความ",
    "problemType": "text",
    "question": "<p>อักษรย่อของ Learning Management System?</p>",
    "textAnswers": ["LMS"],
    "textMatchMode": "ci"
  }
]`;

const XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<problems>
  <problem displayName="Q1 เลือกตอบข้อเดียว" problemType="multiplechoice" maxAttempts="2" showAnswer="attempted">
    <question><![CDATA[<p>2 + 2 = ?</p>]]></question>
    <choices>
      <choice correct="false">3</choice>
      <choice correct="true" hint="ถูกต้อง!">4</choice>
      <choice correct="false">5</choice>
    </choices>
    <explanation><![CDATA[<p>2 + 2 = 4</p>]]></explanation>
  </problem>
  <problem displayName="Q2 เลือกได้หลายข้อ" problemType="checkbox" shuffle="true">
    <question><![CDATA[<p>ข้อใดเป็นจำนวนเฉพาะ? (เลือกได้มากกว่า 1)</p>]]></question>
    <choices>
      <choice correct="true">2</choice>
      <choice correct="false">4</choice>
      <choice correct="true">5</choice>
      <choice correct="false">9</choice>
    </choices>
  </problem>
  <problem displayName="Q3 ดรอปดาวน์" problemType="dropdown">
    <question><![CDATA[<p>เมืองหลวงของประเทศไทยคือข้อใด?</p>]]></question>
    <choices>
      <choice correct="false">เชียงใหม่</choice>
      <choice correct="true">กรุงเทพมหานคร</choice>
      <choice correct="false">ภูเก็ต</choice>
    </choices>
  </problem>
  <problem displayName="Q4 ตอบเป็นตัวเลข" problemType="numerical">
    <question><![CDATA[<p>ค่าประมาณของ π (ทศนิยม 2 ตำแหน่ง)?</p>]]></question>
    <numericalAnswer tolerance="0.01">3.14</numericalAnswer>
  </problem>
  <problem displayName="Q5 ตอบเป็นข้อความ" problemType="text" matchMode="ci">
    <question><![CDATA[<p>อักษรย่อของ Learning Management System?</p>]]></question>
    <textAnswers>
      <answer>LMS</answer>
    </textAnswers>
  </problem>
</problems>`;

export function BulkProblemImport({ onImport, onClose }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"csv" | "json" | "xml">("csv");

  const handleFile = async (f: File) => {
    const t = await f.text();
    setText(t);
    const name = f.name.toLowerCase();
    setMode(name.endsWith(".json") ? "json" : name.endsWith(".xml") ? "xml" : "csv");
  };

  const submit = () => {
    setError(null);
    try {
      const problems = mode === "json" ? parseJson(text) : mode === "xml" ? parseXml(text) : parseCsv(text);
      if (problems.length === 0) throw new Error("ไม่พบข้อมูล problem");
      onImport(problems);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const templateFor = (m: "csv" | "json" | "xml") =>
    m === "csv" ? CSV_TEMPLATE : m === "xml" ? XML_TEMPLATE : JSON_TEMPLATE;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" className="!max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} /> นำเข้า Problem หลายข้อ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={mode} onValueChange={(v) => {
              const m = v as "csv" | "json" | "xml";
              setMode(m);
              setText(templateFor(m));
            }}>
              <TabsList className="bg-default-100 !gap-1 !p-1">
                <TabsTrigger value="csv" className="!px-3">
                  <FileSpreadsheet size={13} className="me-1" /> CSV
                </TabsTrigger>
                <TabsTrigger value="json" className="!px-3">
                  <FileJson size={13} className="me-1" /> JSON
                </TabsTrigger>
                <TabsTrigger value="xml" className="!px-3">
                  <FileCode2 size={13} className="me-1" /> XML
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setText(templateFor(mode))}>
                ใส่ตัวอย่าง
              </Button>
              <label className="inline-flex cursor-pointer">
                <Button asChild variant="outline" size="sm">
                  <span>
                    <Upload size={13} className="me-1.5" /> เลือกไฟล์
                    <input
                      type="file"
                      accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {mode === "csv" && (
            <div className="space-y-1 rounded-md bg-info/10 px-3 py-2 text-xs text-default-700 ring-1 ring-info/20">
              <div className="font-semibold">รูปแบบ CSV — สำหรับข้อแบบเลือกตอบ</div>
              <div>
                คอลัมน์: <code className="rounded bg-background/70 px-1">displayName, problemType, question, choices, maxAttempts</code>
              </div>
              <div>
                <code className="rounded bg-background/70 px-1">problemType</code>: multiplechoice · checkbox · dropdown
              </div>
              <div>
                <code className="rounded bg-background/70 px-1">choices</code> คั่นด้วย <code className="rounded bg-background/70 px-1">|</code>; ใส่ <code className="rounded bg-background/70 px-1">*</code> ต่อท้ายข้อที่ถูก เช่น <code className="rounded bg-background/70 px-1">3|4*|5</code>
              </div>
              <div className="text-default-500">ข้อแบบ numerical / text ให้ใช้แท็บ JSON หรือ XML</div>
            </div>
          )}
          {mode === "json" && (
            <div className="space-y-1 rounded-md bg-info/10 px-3 py-2 text-xs text-default-700 ring-1 ring-info/20">
              <div className="font-semibold">รูปแบบ JSON — รองรับครบ 5 ชนิด</div>
              <div>
                อาเรย์ของ object: <code className="rounded bg-background/70 px-1">displayName, problemType, question</code> + ฟิลด์ตามชนิด
              </div>
              <div>
                เลือกตอบ (mc/checkbox/dropdown): <code className="rounded bg-background/70 px-1">choices</code> = <code className="rounded bg-background/70 px-1">[{'{'} text, correct, hint? {'}'}]</code> หรือสตริง <code className="rounded bg-background/70 px-1">&quot;4*&quot;</code>
              </div>
              <div>
                ตัวเลข: <code className="rounded bg-background/70 px-1">numericalAnswer</code> + <code className="rounded bg-background/70 px-1">numericalTolerance</code> · ข้อความ: <code className="rounded bg-background/70 px-1">textAnswers</code> + <code className="rounded bg-background/70 px-1">textMatchMode</code>
              </div>
            </div>
          )}
          {mode === "xml" && (
            <div className="space-y-1 rounded-md bg-info/10 px-3 py-2 text-xs text-default-700 ring-1 ring-info/20">
              <div className="font-semibold">รูปแบบ XML — รองรับครบ 5 ชนิด</div>
              <div>
                ครอบทุกข้อด้วย <code className="rounded bg-background/70 px-1">&lt;problems&gt;</code>; แต่ละข้อใช้ <code className="rounded bg-background/70 px-1">&lt;problem problemType=&quot;...&quot;&gt;</code>
              </div>
              <div>
                เลือกตอบ: <code className="rounded bg-background/70 px-1">&lt;choices&gt;&lt;choice correct=&quot;true&quot;&gt;</code> · ตัวเลข: <code className="rounded bg-background/70 px-1">&lt;numericalAnswer tolerance=&quot;0.01&quot;&gt;</code> · ข้อความ: <code className="rounded bg-background/70 px-1">&lt;textAnswers&gt;&lt;answer&gt;</code>
              </div>
              <div>
                เนื้อหา HTML ใน <code className="rounded bg-background/70 px-1">&lt;question&gt;</code>/<code className="rounded bg-background/70 px-1">&lt;explanation&gt;</code> ใช้ <code className="rounded bg-background/70 px-1">&lt;![CDATA[...]]&gt;</code>
              </div>
            </div>
          )}

          <Textarea
            rows={12}
            className="!font-mono !text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={templateFor(mode)}
          />

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button color="primary" size="sm" onClick={submit}>
            นำเข้า
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type RawChoice = string | { text?: string; correct?: boolean; hint?: string };
type RawProblem = {
  displayName?: string;
  problemType?: string;
  question?: string;
  choices?: RawChoice[];
  numericalAnswer?: string | number;
  numericalTolerance?: string;
  textAnswers?: string[];
  textMatchMode?: string;
  maxAttempts?: string | number;
  showAnswer?: string;
  explanation?: string;
  weight?: string | number;
  shuffle?: boolean;
};

const PROBLEM_TYPES = ["multiplechoice", "checkbox", "dropdown", "numerical", "text"] as const;
const CHOICE_TYPES = new Set(["multiplechoice", "checkbox", "dropdown"]);
const SHOW_ANSWER = new Set([
  "always", "answered", "attempted", "closed", "finished", "past_due", "correct_or_past_due", "never",
]);
const MATCH_MODES = new Set(["exact", "ci", "regex", "ci-regex"]);

function parseJson(text: string): ProblemBlock[] {
  const parsed = JSON.parse(text);
  const arr: RawProblem[] = Array.isArray(parsed) ? parsed : [parsed];
  return arr.map((p, i) => normalize(p, i));
}

function parseXml(text: string): ProblemBlock[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error(`XML ไม่ถูกต้อง: ${err.textContent?.slice(0, 120)}`);
  const els = Array.from(doc.querySelectorAll("problems > problem"));
  if (els.length === 0) throw new Error("ไม่พบ <problem> ใน <problems>");

  return els.map((el, i) => {
    const raw: RawProblem = {
      displayName: el.getAttribute("displayName") ?? undefined,
      problemType: el.getAttribute("problemType") ?? "multiplechoice",
      question: el.querySelector(":scope > question")?.textContent ?? "",
      maxAttempts: el.getAttribute("maxAttempts") ?? undefined,
      showAnswer: el.getAttribute("showAnswer") ?? undefined,
      weight: el.getAttribute("weight") ?? undefined,
      explanation: el.querySelector(":scope > explanation")?.textContent ?? undefined,
    };
    const shuffleAttr = el.getAttribute("shuffle");
    if (shuffleAttr != null) raw.shuffle = shuffleAttr === "true";

    const choiceEls = el.querySelectorAll(":scope > choices > choice");
    if (choiceEls.length) {
      raw.choices = Array.from(choiceEls).map((c) => ({
        text: c.textContent ?? "",
        correct: c.getAttribute("correct") === "true",
        ...(c.getAttribute("hint") ? { hint: c.getAttribute("hint")! } : {}),
      }));
    }
    const numEl = el.querySelector(":scope > numericalAnswer");
    if (numEl) {
      raw.numericalAnswer = numEl.textContent?.trim();
      raw.numericalTolerance = numEl.getAttribute("tolerance") ?? undefined;
    }
    const ansEls = el.querySelectorAll(":scope > textAnswers > answer");
    if (ansEls.length) raw.textAnswers = Array.from(ansEls).map((a) => a.textContent ?? "");
    const matchMode = el.getAttribute("matchMode");
    if (matchMode) raw.textMatchMode = matchMode;

    return normalize(raw, i);
  });
}

function parseCsv(text: string): ProblemBlock[] {
  const rows = parseCsvRows(text.trim());
  if (rows.length < 2) throw new Error("CSV ต้องมี header + อย่างน้อย 1 แถว");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const dn = idx("displayname"),
    pt = idx("problemtype"),
    q = idx("question"),
    ch = idx("choices"),
    ma = idx("maxattempts");
  if (q < 0 || ch < 0) throw new Error("CSV ต้องมีคอลัมน์ question และ choices");

  return rows.slice(1).map((r, i) => {
    const choicesRaw = (r[ch] ?? "").split("|").map((s) => s.trim()).filter(Boolean);
    if (choicesRaw.length < 2) throw new Error(`แถว ${i + 2}: choices ต้อง ≥ 2 (ใช้ | คั่น)`);
    return normalize(
      {
        displayName: dn >= 0 ? r[dn] : undefined,
        problemType: pt >= 0 ? r[pt] : "multiplechoice",
        question: r[q],
        choices: choicesRaw,
        maxAttempts: ma >= 0 && r[ma] ? r[ma] : undefined,
      },
      i,
    );
  });
}

function normalize(p: RawProblem, i: number): ProblemBlock {
  const n = i + 1;
  if (!p.question || !String(p.question).trim()) throw new Error(`ข้อ ${n}: ไม่มี question`);
  const ptype = (PROBLEM_TYPES as readonly string[]).includes(String(p.problemType))
    ? (p.problemType as ProblemBlock["problemType"])
    : "multiplechoice";

  const block: ProblemBlock = {
    type: "problem",
    displayName: (p.displayName && String(p.displayName).trim()) || `Problem ${n}`,
    problemType: ptype,
    question: String(p.question),
  };

  if (CHOICE_TYPES.has(ptype)) {
    if (!Array.isArray(p.choices) || p.choices.length < 2)
      throw new Error(`ข้อ ${n}: ต้องมี choices ≥ 2`);
    const choices = p.choices.map((c) => {
      if (typeof c === "string") {
        const correct = c.trim().endsWith("*");
        return { text: c.replace(/\*\s*$/, "").trim(), correct };
      }
      return {
        text: String(c.text ?? "").trim(),
        correct: !!c.correct,
        ...(c.hint ? { hint: String(c.hint) } : {}),
      };
    });
    if (choices.some((c) => !c.text)) throw new Error(`ข้อ ${n}: มีตัวเลือกที่ข้อความว่าง`);
    if (!choices.some((c) => c.correct))
      throw new Error(`ข้อ ${n}: ต้องมีคำตอบที่ถูกอย่างน้อย 1 ข้อ (ใส่ * หรือ correct:true)`);
    block.choices = choices;
  } else if (ptype === "numerical") {
    const ans = typeof p.numericalAnswer === "string" ? Number(p.numericalAnswer) : p.numericalAnswer;
    if (ans == null || Number.isNaN(ans))
      throw new Error(`ข้อ ${n}: numerical ต้องมี numericalAnswer เป็นตัวเลข`);
    block.numericalAnswer = ans;
    if (p.numericalTolerance) block.numericalTolerance = String(p.numericalTolerance);
  } else if (ptype === "text") {
    const answers = (p.textAnswers ?? []).map((s) => String(s).trim()).filter(Boolean);
    if (answers.length === 0)
      throw new Error(`ข้อ ${n}: text ต้องมี textAnswers อย่างน้อย 1 คำตอบ`);
    block.textAnswers = answers;
    if (p.textMatchMode && MATCH_MODES.has(p.textMatchMode))
      block.textMatchMode = p.textMatchMode as ProblemBlock["textMatchMode"];
  }

  if (p.maxAttempts != null && p.maxAttempts !== "") {
    const m = Number(p.maxAttempts);
    if (Number.isInteger(m) && m > 0) block.maxAttempts = m;
  }
  if (p.showAnswer && SHOW_ANSWER.has(p.showAnswer))
    block.showAnswer = p.showAnswer as ProblemBlock["showAnswer"];
  if (p.explanation && String(p.explanation).trim()) block.explanation = String(p.explanation);
  if (p.weight != null && p.weight !== "") {
    const w = Number(p.weight);
    if (!Number.isNaN(w) && w >= 0) block.weight = w;
  }
  if (typeof p.shuffle === "boolean") block.shuffle = p.shuffle;

  return block;
}

function parseCsvRows(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n" || c === "\r") {
        if (cur.length > 0 || row.length > 0) {
          row.push(cur);
          out.push(row);
          row = [];
          cur = "";
        }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    out.push(row);
  }
  return out;
}
