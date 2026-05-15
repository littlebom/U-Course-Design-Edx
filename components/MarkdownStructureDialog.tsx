"use client";

import { useState, useMemo } from "react";
import { FileText, ChevronRight, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Chapter, Sequential, Vertical } from "@/lib/schema";

type Props = {
  open: boolean;
  onClose: () => void;
  onImport: (chapters: Chapter[]) => void;
};

// ─── Parser ──────────────────────────────────────────────────────────────────

function emptyVertical(name: string): Vertical {
  return {
    displayName: name,
    blocks: [{ type: "html", displayName: name, html: "" }],
  };
}

function parseMarkdown(md: string): { chapters: Chapter[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);

  const chapters: Chapter[] = [];
  let curChapter: Chapter | null = null;
  let curSequential: Sequential | null = null;

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h3) {
      // Unit — ต้องอยู่ใน SubSection
      const name = h3[1].trim();
      if (!curSequential) {
        if (!curChapter) {
          curChapter = { displayName: "Section 1", sequentials: [] };
          chapters.push(curChapter);
          warnings.push(`"${name}": ไม่พบ Section และ SubSection — สร้าง Section 1 อัตโนมัติ`);
        }
        curSequential = { displayName: "SubSection 1", verticals: [] };
        curChapter.sequentials.push(curSequential);
        warnings.push(`"${name}": ไม่พบ SubSection — สร้าง SubSection 1 อัตโนมัติ`);
      }
      curSequential.verticals.push(emptyVertical(name));
    } else if (h2) {
      // SubSection
      const name = h2[1].trim();
      if (!curChapter) {
        curChapter = { displayName: "Section 1", sequentials: [] };
        chapters.push(curChapter);
        warnings.push(`"${name}": ไม่พบ Section — สร้าง Section 1 อัตโนมัติ`);
      }
      curSequential = { displayName: name, verticals: [] };
      curChapter.sequentials.push(curSequential);
    } else if (h1) {
      // Section
      const name = h1[1].trim();
      curChapter = { displayName: name, sequentials: [] };
      curSequential = null;
      chapters.push(curChapter);
    }
    // ข้ามบรรทัดที่ไม่ใช่ heading
  }

  // Validate — sequential ต้องมี vertical อย่างน้อย 1
  for (const ch of chapters) {
    for (const seq of ch.sequentials) {
      if (seq.verticals.length === 0) {
        seq.verticals.push(emptyVertical("Unit 1"));
        warnings.push(`SubSection "${seq.displayName}" ไม่มี Unit — เพิ่ม Unit 1 อัตโนมัติ`);
      }
    }
    if (ch.sequentials.length === 0) {
      const seq: Sequential = { displayName: "SubSection 1", verticals: [emptyVertical("Unit 1")] };
      ch.sequentials.push(seq);
      warnings.push(`Section "${ch.displayName}" ไม่มี SubSection — เพิ่มอัตโนมัติ`);
    }
  }

  return { chapters, warnings };
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function Preview({ chapters }: { chapters: Chapter[] }) {
  if (chapters.length === 0)
    return <p className="text-xs text-muted-foreground">ยังไม่มีโครงสร้าง</p>;

  return (
    <ul className="space-y-1.5 text-xs">
      {chapters.map((ch, ci) => (
        <li key={ci}>
          <div className="flex items-center gap-1 font-semibold text-primary">
            <FileText size={11} /> {ch.displayName}
          </div>
          <ul className="ml-3 mt-0.5 space-y-0.5">
            {ch.sequentials.map((seq, si) => (
              <li key={si}>
                <div className="flex items-center gap-1 text-default-600">
                  <ChevronRight size={10} /> {seq.displayName}
                </div>
                <ul className="ml-4">
                  {seq.verticals.map((v, vi) => (
                    <li key={vi} className="flex items-center gap-1 text-default-400">
                      <ChevronRight size={9} /> {v.displayName}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

// ─── Example placeholder ─────────────────────────────────────────────────────

const EXAMPLE = `# บทที่ 1: Introduction
## 1.1 Overview
### Welcome to the Course
### Getting Started
## 1.2 Basics
### Core Concepts

# บทที่ 2: Deep Dive
## 2.1 Advanced Topics
### Topic A
### Topic B
### Topic C
## 2.2 Case Studies
### Case Study 1
### Case Study 2`;

// ─── Dialog ──────────────────────────────────────────────────────────────────

export function MarkdownStructureDialog({ open, onClose, onImport }: Props) {
  const [md, setMd] = useState("");

  const { chapters, warnings } = useMemo(() => {
    if (!md.trim()) return { chapters: [], warnings: [] };
    return parseMarkdown(md);
  }, [md]);

  const totalUnits = chapters.reduce(
    (s, ch) => s + ch.sequentials.reduce((ss, seq) => ss + seq.verticals.length, 0),
    0,
  );

  const handleImport = () => {
    if (chapters.length === 0) return;
    onImport(chapters);
    setMd("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" className="!max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} /> Import โครงสร้างจาก Markdown
          </DialogTitle>
        </DialogHeader>

        <div className="grid flex-1 min-h-0 grid-cols-2 gap-4 overflow-hidden">
          {/* Input */}
          <div className="flex flex-col gap-2 min-h-0">
            <p className="text-xs text-muted-foreground">
              วาง Markdown ที่มี Heading 3 ระดับ:
              <br />
              <code className="rounded bg-muted px-1">#</code> Section &nbsp;
              <code className="rounded bg-muted px-1">##</code> SubSection &nbsp;
              <code className="rounded bg-muted px-1">###</code> Unit
            </p>
            <Textarea
              className="flex-1 min-h-0 !font-mono !text-xs resize-none"
              placeholder={EXAMPLE}
              value={md}
              onChange={(e) => setMd(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="self-start text-xs"
              onClick={() => setMd(EXAMPLE)}
            >
              ใส่ตัวอย่าง
            </Button>
          </div>

          {/* Preview */}
          <div className="flex flex-col gap-2 min-h-0 overflow-auto rounded-md border border-default-200 bg-default-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                Preview
              </p>
              {chapters.length > 0 && (
                <span className="text-2xs text-muted-foreground">
                  {chapters.length} Section · {chapters.reduce((s, c) => s + c.sequentials.length, 0)} SubSection · {totalUnits} Unit
                </span>
              )}
            </div>
            <Preview chapters={chapters} />

            {warnings.length > 0 && (
              <div className="mt-2 space-y-1 rounded-md bg-warning/10 p-2 text-2xs text-warning">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <AlertCircle size={10} className="mt-0.5 shrink-0" /> {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            color="primary"
            size="sm"
            disabled={chapters.length === 0}
            onClick={handleImport}
          >
            Import {chapters.length > 0 ? `(${totalUnits} Unit)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
