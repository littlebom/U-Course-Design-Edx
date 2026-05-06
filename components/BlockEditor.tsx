"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Trash2, FileText, HelpCircle, Video, Code2, Sparkles } from "lucide-react";
import type { Block, Course, ProblemBlock, VideoBlock } from "@/lib/schema";
import type { AssetFile } from "./AssetUploader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RichEditor = dynamic(
  () => import("./RichEditor").then((m) => ({ default: m.RichEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[420px] place-items-center rounded-md border border-default-200 bg-default-50 text-sm text-default-500">
        กำลังโหลด editor…
      </div>
    ),
  },
);

type Props = {
  course: Course;
  path: { ci: number; si: number; vi: number; bi: number };
  onChange: (next: Course) => void;
  assets: Map<string, AssetFile>;
  onAddAsset: (file: File, suggestedName?: string) => string;
};

export function BlockEditor({ course, path, onChange, assets, onAddAsset }: Props) {
  const block = course.chapters[path.ci]?.sequentials[path.si]?.verticals[path.vi]?.blocks[path.bi];
  if (!block) return <div className="text-sm text-muted-foreground">เลือก block จากโครงสร้าง</div>;

  const update = (mut: (b: Block) => void) => {
    const next = structuredClone(course);
    const b = next.chapters[path.ci].sequentials[path.si].verticals[path.vi].blocks[path.bi];
    mut(b);
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-md text-white shadow-base",
            block.type === "html"
              ? "bg-default-600"
              : block.type === "video"
                ? "bg-destructive"
                : "bg-warning",
          )}
        >
          {block.type === "html" ? (
            <FileText size={16} />
          ) : block.type === "video" ? (
            <Video size={16} />
          ) : (
            <HelpCircle size={16} />
          )}
        </span>
        <div>
          <div className="text-base font-semibold tracking-tight">
            {block.type === "html" ? "HTML Block" : block.type === "video" ? "Video" : "Problem"}
          </div>
          <Badge
            color={
              block.type === "html"
                ? "secondary"
                : block.type === "video"
                  ? "destructive"
                  : "warning"
            }
            className="mt-0.5"
          >
            {block.type === "html"
              ? "เนื้อหา HTML"
              : block.type === "video"
                ? "YouTube"
                : (block as ProblemBlock).problemType === "multiplechoice"
                  ? "เลือก 1 ข้อ"
                  : "เลือกหลายข้อ"}
          </Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>ชื่อแสดงผล</Label>
        <Input value={block.displayName} onChange={(e) => update((b) => (b.displayName = e.target.value))} />
      </div>

      {block.type === "html" ? (
        <HtmlField
          html={block.html}
          onChange={(v) => update((b) => ((b as Extract<Block, { type: "html" }>).html = v))}
          assets={assets}
          onAddAsset={onAddAsset}
        />
      ) : block.type === "video" ? (
        <VideoFields block={block} update={update} />
      ) : (
        <ProblemFields block={block} update={update} />
      )}
    </div>
  );
}

function HtmlField({
  html,
  onChange,
  assets,
  onAddAsset,
}: {
  html: string;
  onChange: (v: string) => void;
  assets: Map<string, AssetFile>;
  onAddAsset: (file: File, suggestedName?: string) => string;
}) {
  const [mode, setMode] = useState<"rich" | "source">("rich");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>เนื้อหา HTML</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            อ้างรูปด้วย <code className="rounded bg-muted px-1">asset://&lt;ชื่อไฟล์&gt;</code>
          </span>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "rich" | "source")}>
            <TabsList className="bg-default-100 !gap-1 !p-0.5">
              <TabsTrigger value="rich" className="!h-6 !px-2 !text-xs">
                <Sparkles size={11} className="me-1" /> Rich
              </TabsTrigger>
              <TabsTrigger value="source" className="!h-6 !px-2 !text-xs">
                <Code2 size={11} className="me-1" /> Source
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      {mode === "rich" ? (
        <RichEditor value={html} onChange={onChange} assets={assets} onAddAsset={onAddAsset} />
      ) : (
        <Textarea
          rows={18}
          className="!font-mono !text-xs"
          value={html}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function VideoFields({
  block,
  update,
}: {
  block: VideoBlock;
  update: (mut: (b: Block) => void) => void;
}) {
  const setVideo = (mut: (v: VideoBlock) => void) => update((b) => mut(b as VideoBlock));
  const id = parseYoutubeId(block.youtubeId);

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>YouTube ID หรือ URL</Label>
          <span className="text-xs text-muted-foreground">
            เช่น <code className="rounded bg-muted px-1">dQw4w9WgXcQ</code> หรือ URL เต็ม
          </span>
        </div>
        <Input
          value={block.youtubeId}
          onChange={(e) => setVideo((v) => (v.youtubeId = parseYoutubeId(e.target.value)))}
          placeholder="dQw4w9WgXcQ"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="dl-allow"
          type="checkbox"
          checked={block.downloadAllowed}
          onChange={(e) => setVideo((v) => (v.downloadAllowed = e.target.checked))}
          className="size-4 accent-primary"
        />
        <Label htmlFor="dl-allow" className="!text-default-700">
          อนุญาตให้ดาวน์โหลดวิดีโอได้
        </Label>
      </div>

      {id && (
        <div className="space-y-1.5">
          <Label>ตัวอย่าง</Label>
          <div className="aspect-video w-full overflow-hidden rounded-md border border-default-200 bg-default-100">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              className="h-full w-full"
              title="YouTube preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}

function parseYoutubeId(input: string): string {
  const trimmed = input.trim();
  const m =
    trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : trimmed;
}

function ProblemFields({
  block,
  update,
}: {
  block: ProblemBlock;
  update: (mut: (b: Block) => void) => void;
}) {
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
