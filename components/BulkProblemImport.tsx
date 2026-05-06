"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, FileJson } from "lucide-react";
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

const CSV_TEMPLATE = `displayName,problemType,question,choices,maxAttempts
"Q1","multiplechoice","2+2 = ?","3|4*|5",1
"Q2","checkbox","เลือกจำนวนเฉพาะ","2*|4|5*|9",2
`;

const JSON_TEMPLATE = `[
  {
    "displayName": "Q1",
    "problemType": "multiplechoice",
    "question": "2+2 = ?",
    "choices": [
      { "text": "3", "correct": false },
      { "text": "4", "correct": true },
      { "text": "5", "correct": false }
    ]
  }
]`;

export function BulkProblemImport({ onImport, onClose }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"csv" | "json">("csv");

  const handleFile = async (f: File) => {
    const t = await f.text();
    setText(t);
    setMode(f.name.toLowerCase().endsWith(".json") ? "json" : "csv");
  };

  const submit = () => {
    setError(null);
    try {
      const problems = mode === "json" ? parseJson(text) : parseCsv(text);
      if (problems.length === 0) throw new Error("ไม่พบข้อมูล problem");
      onImport(problems);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

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
              const m = v as "csv" | "json";
              setMode(m);
              setText(m === "csv" ? CSV_TEMPLATE : JSON_TEMPLATE);
            }}>
              <TabsList className="bg-default-100 !gap-1 !p-1">
                <TabsTrigger value="csv" className="!px-3">
                  <FileSpreadsheet size={13} className="me-1" /> CSV
                </TabsTrigger>
                <TabsTrigger value="json" className="!px-3">
                  <FileJson size={13} className="me-1" /> JSON
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <label className="ml-auto inline-flex cursor-pointer">
              <Button asChild variant="outline" size="sm">
                <span>
                  <Upload size={13} className="me-1.5" /> เลือกไฟล์
                  <input
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </span>
              </Button>
            </label>
          </div>

          {mode === "csv" && (
            <div className="space-y-1 rounded-md bg-info/10 px-3 py-2 text-xs text-default-700 ring-1 ring-info/20">
              <div className="font-semibold">รูปแบบ CSV</div>
              <div>
                คอลัมน์: <code className="rounded bg-background/70 px-1">displayName, problemType, question, choices, maxAttempts</code>
              </div>
              <div>
                <code className="rounded bg-background/70 px-1">choices</code> คั่นด้วย <code className="rounded bg-background/70 px-1">|</code>; ใส่ <code className="rounded bg-background/70 px-1">*</code> ต่อท้ายข้อที่ถูก เช่น <code className="rounded bg-background/70 px-1">3|4*|5</code>
              </div>
            </div>
          )}

          <Textarea
            rows={12}
            className="!font-mono !text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "csv" ? CSV_TEMPLATE : JSON_TEMPLATE}
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

function parseJson(text: string): ProblemBlock[] {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr.map((p, i) => normalize(p, i));
}

function normalize(p: any, i: number): ProblemBlock {
  if (!p.question) throw new Error(`ข้อ ${i + 1}: ไม่มี question`);
  if (!Array.isArray(p.choices) || p.choices.length < 2)
    throw new Error(`ข้อ ${i + 1}: ต้องมี choices ≥ 2`);
  return {
    type: "problem",
    displayName: p.displayName ?? `Problem ${i + 1}`,
    problemType: p.problemType === "checkbox" ? "checkbox" : "multiplechoice",
    question: p.question,
    choices: p.choices.map((c: any) =>
      typeof c === "string"
        ? { text: c.replace(/\*$/, ""), correct: c.endsWith("*") }
        : { text: String(c.text), correct: !!c.correct },
    ),
    maxAttempts: p.maxAttempts ? Number(p.maxAttempts) : undefined,
  };
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
