"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ChevronRight,
  AlertCircle,
  Pilcrow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import type { Chapter, Sequential, Vertical } from "@/lib/schema";

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
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = !h3 && line.match(/^##\s+(.+)/);
    const h1 = !h3 && !h2 && line.match(/^#\s+(.+)/);

    if (h1) {
      curChapter = { displayName: h1[1].trim(), sequentials: [] };
      curSequential = null;
      chapters.push(curChapter);
    } else if (h2) {
      if (!curChapter) {
        curChapter = { displayName: "Section 1", sequentials: [] };
        chapters.push(curChapter);
        warnings.push(`"${h2[1]}": ไม่พบ Section — สร้าง Section 1 อัตโนมัติ`);
      }
      curSequential = { displayName: h2[1].trim(), verticals: [] };
      curChapter.sequentials.push(curSequential);
    } else if (h3) {
      if (!curChapter) {
        curChapter = { displayName: "Section 1", sequentials: [] };
        chapters.push(curChapter);
        warnings.push(`"${h3[1]}": ไม่พบ Section — สร้าง Section 1 อัตโนมัติ`);
      }
      if (!curSequential) {
        curSequential = { displayName: "SubSection 1", verticals: [] };
        curChapter.sequentials.push(curSequential);
        warnings.push(`"${h3[1]}": ไม่พบ SubSection — สร้าง SubSection 1 อัตโนมัติ`);
      }
      curSequential.verticals.push(emptyVertical(h3[1].trim()));
    }
  }

  // Auto-fill empty containers
  for (const ch of chapters) {
    if (ch.sequentials.length === 0) {
      ch.sequentials.push({ displayName: "SubSection 1", verticals: [emptyVertical("Unit 1")] });
      warnings.push(`Section "${ch.displayName}" ไม่มี SubSection — เพิ่มอัตโนมัติ`);
    }
    for (const seq of ch.sequentials) {
      if (seq.verticals.length === 0) {
        seq.verticals.push(emptyVertical("Unit 1"));
        warnings.push(`SubSection "${seq.displayName}" ไม่มี Unit — เพิ่ม Unit 1 อัตโนมัติ`);
      }
    }
  }

  return { chapters, warnings };
}

// ─── Preview tree ─────────────────────────────────────────────────────────────

function Preview({ chapters }: { chapters: Chapter[] }) {
  if (chapters.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        โครงสร้างจะแสดงที่นี่เมื่อคุณวาง Markdown ทางซ้าย
      </p>
    );

  return (
    <ul className="space-y-3 text-sm">
      {chapters.map((ch, ci) => (
        <li key={ci}>
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <FileText size={13} />
            <span>{ch.displayName}</span>
            <span className="ml-auto text-2xs font-normal text-muted-foreground">
              Section
            </span>
          </div>
          <ul className="ml-4 mt-1 space-y-1 border-l border-default-200 pl-3">
            {ch.sequentials.map((seq, si) => (
              <li key={si}>
                <div className="flex items-center gap-1 text-default-700">
                  <ChevronRight size={11} className="shrink-0 text-default-400" />
                  <span className="font-medium">{seq.displayName}</span>
                  <span className="ml-auto text-2xs text-muted-foreground">SubSection</span>
                </div>
                <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-default-100 pl-3">
                  {seq.verticals.map((v, vi) => (
                    <li key={vi} className="flex items-center gap-1 text-default-500 text-xs">
                      <ChevronRight size={10} className="shrink-0" />
                      {v.displayName}
                      <span className="ml-auto text-2xs text-muted-foreground">Unit</span>
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

// ─── Example ──────────────────────────────────────────────────────────────────

const EXAMPLE = `# บทที่ 1: Introduction
## 1.1 Overview
### Welcome to the Course
### Getting Started
## 1.2 Basics
### Core Concepts
### Key Terminology

# บทที่ 2: Deep Dive
## 2.1 Advanced Topics
### Topic A
### Topic B
### Topic C
## 2.2 Case Studies
### Case Study 1
### Case Study 2

# บทที่ 3: Summary
## 3.1 Review
### Key Takeaways
### Next Steps`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarkdownImportPage() {
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center text-default-400">กำลังโหลด…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const editorHref = courseId ? `/?courseId=${courseId}` : "/courses";
  const [md, setMd] = useState("");

  const { chapters, warnings } = useMemo(() => {
    if (!md.trim()) return { chapters: [], warnings: [] };
    return parseMarkdown(md);
  }, [md]);

  const totalSections = chapters.length;
  const totalSubSections = chapters.reduce((s, ch) => s + ch.sequentials.length, 0);
  const totalUnits = chapters.reduce(
    (s, ch) => s + ch.sequentials.reduce((ss, seq) => ss + seq.verticals.length, 0),
    0,
  );

  const handleImport = () => {
    if (chapters.length === 0) return;
    sessionStorage.setItem("u-coursebuilder:md-import", JSON.stringify(chapters));
    router.push(editorHref);
  };

  return (
    <div className="flex h-screen flex-col bg-default-50">
      <Navbar
        showBackToCourses
        brand={
          <div className="flex items-center gap-2">
            <Pilcrow size={16} className="text-default-500" />
            <span className="text-sm font-semibold text-default-700">
              Import โครงสร้างจาก Markdown
            </span>
          </div>
        }
        right={
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push(editorHref)}>
              <ArrowLeft size={14} className="me-1.5" /> กลับไปยัง Editor
            </Button>
            <Button
              color="primary"
              size="sm"
              disabled={chapters.length === 0}
              onClick={handleImport}
            >
              เพิ่มเข้าคอร์ส{" "}
              {totalUnits > 0
                ? `(${totalSections} Section · ${totalSubSections} SubSection · ${totalUnits} Unit)`
                : ""}
            </Button>
          </>
        }
      />

      {/* Body */}
      <main className="grid flex-1 min-h-0 grid-cols-2 gap-0 overflow-hidden">
        {/* Left — Editor */}
        <div className="flex flex-col border-r">
          <div className="flex items-center justify-between border-b bg-background px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-default-400">
              Markdown
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5">#</code> Section
              <code className="rounded bg-muted px-1.5 py-0.5">##</code> SubSection
              <code className="rounded bg-muted px-1.5 py-0.5">###</code> Unit
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-6 text-xs"
                onClick={() => setMd(EXAMPLE)}
              >
                ใส่ตัวอย่าง
              </Button>
            </div>
          </div>
          <Textarea
            className="flex-1 rounded-none border-0 !font-mono !text-sm resize-none focus-visible:ring-0"
            placeholder={`# Section\n## SubSection\n### Unit`}
            value={md}
            onChange={(e) => setMd(e.target.value)}
          />
        </div>

        {/* Right — Preview */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b bg-background px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-default-400">
              Preview
            </p>
            {chapters.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalSections} Section · {totalSubSections} SubSection · {totalUnits} Unit
              </p>
            )}
          </div>
          <div className="flex-1 overflow-auto p-5">
            <Preview chapters={chapters} />

            {warnings.length > 0 && (
              <div className="mt-4 space-y-1.5 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <p className="font-semibold">Auto-fix {warnings.length} รายการ:</p>
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <AlertCircle size={11} className="mt-0.5 shrink-0" /> {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
