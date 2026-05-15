"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Trash2, FileText, HelpCircle, Video, MessageSquare, Link2, Code2, Sparkles, BarChart2, BookOpenCheck, Library, Subtitles } from "lucide-react";
import type { Block, Course, ProblemBlock, VideoBlock, VideoTranscript, DiscussionBlock, LtiBlock, PollBlock, PollAnswer, OraBlock, LibraryContentBlock, UnknownBlock } from "@/lib/schema";
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
                : block.type === "discussion"
                  ? "bg-success"
                  : block.type === "lti"
                    ? "bg-info"
                    : block.type === "poll"
                      ? "bg-purple-500"
                      : block.type === "ora"
                        ? "bg-rose-600"
                        : block.type === "library_content"
                          ? "bg-teal-600"
                          : block.type === "unknown"
                            ? "bg-slate-500"
                            : "bg-warning",
          )}
        >
          {block.type === "html" ? (
            <FileText size={16} />
          ) : block.type === "video" ? (
            <Video size={16} />
          ) : block.type === "discussion" ? (
            <MessageSquare size={16} />
          ) : block.type === "lti" ? (
            <Link2 size={16} />
          ) : block.type === "poll" ? (
            <BarChart2 size={16} />
          ) : block.type === "ora" ? (
            <BookOpenCheck size={16} />
          ) : block.type === "library_content" ? (
            <Library size={16} />
          ) : block.type === "unknown" ? (
            <Code2 size={16} />
          ) : (
            <HelpCircle size={16} />
          )}
        </span>
        <div>
          <div className="text-base font-semibold tracking-tight">
            {block.type === "html" ? "HTML Block"
              : block.type === "video" ? "Video"
              : block.type === "discussion" ? "Discussion"
              : block.type === "lti" ? "LTI Block"
              : block.type === "poll" ? "Poll"
              : block.type === "ora" ? "Open Response Assessment"
              : block.type === "library_content" ? "Library Content"
              : block.type === "unknown" ? `Unknown Block (${(block as UnknownBlock).blockType})`
              : "Problem"}
          </div>
          <Badge
            color={
              block.type === "html"
                ? "secondary"
                : block.type === "video"
                  ? "destructive"
                  : block.type === "discussion"
                    ? "success"
                    : block.type === "lti"
                      ? "default"
                      : block.type === "poll" || block.type === "ora" || block.type === "library_content" || block.type === "unknown"
                        ? "secondary"
                        : "warning"
            }
            className="mt-0.5"
          >
            {block.type === "html"
              ? "เนื้อหา HTML"
              : block.type === "video"
                ? "YouTube / MP4"
                : block.type === "discussion"
                  ? "กระดานสนทนา"
                  : block.type === "lti"
                    ? "LTI 1.3"
                    : block.type === "poll"
                      ? "สำรวจความคิดเห็น"
                      : block.type === "ora"
                        ? "Pass-through"
                        : block.type === "library_content"
                          ? `สุ่ม ${(block as LibraryContentBlock).maxCount} ข้อ`
                          : block.type === "unknown"
                            ? "Pass-through"
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
      ) : block.type === "discussion" ? (
        <DiscussionFields block={block} update={update} />
      ) : block.type === "lti" ? (
        <LtiFields block={block} update={update} />
      ) : block.type === "poll" ? (
        <PollFields block={block} update={update} />
      ) : block.type === "ora" ? (
        <OraView block={block} />
      ) : block.type === "library_content" ? (
        <LibraryContentView block={block} />
      ) : block.type === "unknown" ? (
        <UnknownView block={block as UnknownBlock} />
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

      <div className="space-y-1.5">
        <Label>MP4 URL (ทางเลือก / แทน YouTube)</Label>
        <Input
          value={block.mp4Url}
          onChange={(e) => setVideo((v) => (v.mp4Url = e.target.value.trim()))}
          placeholder="https://example.com/video.mp4"
        />
        <p className="text-xs text-default-400">ถ้ากำหนดทั้ง YouTube และ MP4 — Open edX จะใช้ MP4 เป็นหลัก</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <Subtitles size={13} /> Transcripts (SRT)
          </Label>
          <button
            type="button"
            onClick={() => setVideo((v) => v.transcripts.push({ lang: "th", srtFile: "" }))}
            className="inline-flex items-center gap-1 rounded border border-dashed border-default-300 px-2 py-0.5 text-xs text-default-500 hover:border-primary hover:text-primary"
          >
            <Plus size={11} /> เพิ่มภาษา
          </button>
        </div>
        {block.transcripts.length === 0 && (
          <p className="text-xs text-default-400">ยังไม่มี transcript — คลิก "เพิ่มภาษา" เพื่อเพิ่ม</p>
        )}
        {block.transcripts.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={t.lang}
              onChange={(e) => setVideo((v) => (v.transcripts[i].lang = e.target.value.toLowerCase()))}
              className="w-16 !font-mono text-center"
              placeholder="en"
              maxLength={5}
            />
            <Input
              value={t.srtFile}
              onChange={(e) => setVideo((v) => (v.transcripts[i].srtFile = e.target.value.trim()))}
              placeholder="ชื่อไฟล์ .srt ใน static/ เช่น uuid-en.srt"
              className="flex-1 !font-mono !text-xs"
            />
            <button
              type="button"
              onClick={() => setVideo((v) => v.transcripts.splice(i, 1))}
              className="rounded p-1 text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {id && (
        <div className="space-y-1.5">
          <Label>ตัวอย่าง YouTube</Label>
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

function LtiFields({
  block,
  update,
}: {
  block: LtiBlock;
  update: (fn: (b: Block) => void) => void;
}) {
  const set = (fn: (b: LtiBlock) => void) => update((b) => fn(b as LtiBlock));
  return (
    <div className="space-y-3">
      <div>
        <Label>LTI Version</Label>
        <select
          value={block.ltiVersion}
          onChange={(e) => set((b) => (b.ltiVersion = e.target.value as "lti_1p3" | "lti_1p1"))}
          className="w-full rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="lti_1p3">LTI 1.3 (แนะนำ)</option>
          <option value="lti_1p1">LTI 1.1 (เก่า)</option>
        </select>
      </div>
      <div>
        <Label>Launch URL *</Label>
        <Input
          value={block.launchUrl}
          onChange={(e) => set((b) => (b.launchUrl = e.target.value))}
          placeholder="https://tool.example.com/lti/launch"
        />
      </div>
      <div>
        <Label>OIDC Login URL (LTI 1.3)</Label>
        <Input
          value={block.oidcUrl}
          onChange={(e) => set((b) => (b.oidcUrl = e.target.value))}
          placeholder="https://tool.example.com/lti/login"
        />
      </div>
      <div>
        <Label>Keyset URL (LTI 1.3)</Label>
        <Input
          value={block.keysetUrl}
          onChange={(e) => set((b) => (b.keysetUrl = e.target.value))}
          placeholder="https://tool.example.com/lti/jwks"
        />
      </div>
      <div>
        <Label>ข้อความปุ่ม (Button Text)</Label>
        <Input
          value={block.buttonText}
          onChange={(e) => set((b) => (b.buttonText = e.target.value))}
          placeholder="เปิดแบบทดสอบ"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <Label>Launch Target</Label>
          <select
            value={block.launchTarget}
            onChange={(e) => set((b) => (b.launchTarget = e.target.value as "iframe" | "new_window"))}
            className="w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="new_window">New Window</option>
            <option value="iframe">iFrame</option>
          </select>
        </div>
        <div className="flex-1">
          <Label>น้ำหนักคะแนน (Weight)</Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={block.weight}
            onChange={(e) => set((b) => (b.weight = Number(e.target.value)))}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="lti-has-score"
          checked={block.hasScore}
          onChange={(e) => set((b) => (b.hasScore = e.target.checked))}
        />
        <Label htmlFor="lti-has-score">มีคะแนน (has_score)</Label>
      </div>
    </div>
  );
}

function DiscussionFields({
  block,
  update,
}: {
  block: DiscussionBlock;
  update: (fn: (b: Block) => void) => void;
}) {
  const set = (fn: (b: DiscussionBlock) => void) => update((b) => fn(b as DiscussionBlock));
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>หมวดหมู่ (Discussion Category)</Label>
        <Input
          value={block.discussionCategory}
          placeholder="เช่น General, Week 1"
          onChange={(e) => set((b) => (b.discussionCategory = e.target.value))}
        />
        <p className="text-xs text-default-400">ใช้จัดกลุ่ม discussion ใน edX — ปรากฏใน Discussion tab</p>
      </div>
      <div className="space-y-1.5">
        <Label>หัวข้อ (Discussion Target)</Label>
        <Input
          value={block.discussionTarget}
          placeholder="เช่น แลกเปลี่ยนความคิดเห็นเรื่อง..."
          onChange={(e) => set((b) => (b.discussionTarget = e.target.value))}
        />
        <p className="text-xs text-default-400">ชื่อหัวข้อย่อยภายใน category (ถ้าว่างจะใช้ชื่อ block)</p>
      </div>
    </div>
  );
}

function PollFields({
  block,
  update,
}: {
  block: PollBlock;
  update: (fn: (b: Block) => void) => void;
}) {
  const set = (fn: (b: PollBlock) => void) => update((b) => fn(b as PollBlock));
  const setAnswer = (i: number, fn: (a: PollAnswer) => void) =>
    set((b) => fn(b.answers[i]));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>คำถาม (Question)</Label>
        <Textarea
          rows={2}
          value={block.question}
          onChange={(e) => set((b) => (b.question = e.target.value))}
          placeholder="พิมพ์คำถามที่ต้องการถาม..."
        />
      </div>

      <div className="space-y-2">
        <Label>ตัวเลือกคำตอบ</Label>
        {block.answers.map((ans, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={ans.id}
              onChange={(e) => setAnswer(i, (a) => (a.id = e.target.value.toUpperCase()))}
              className="w-16 !font-mono text-center"
              placeholder="ID"
              maxLength={4}
            />
            <Input
              value={ans.label}
              onChange={(e) => setAnswer(i, (a) => (a.label = e.target.value))}
              placeholder={`ตัวเลือก ${i + 1}`}
              className="flex-1"
            />
            {block.answers.length > 2 && (
              <button
                type="button"
                onClick={() => set((b) => b.answers.splice(i, 1))}
                className="rounded p-1 text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => set((b) => b.answers.push({ id: String.fromCharCode(65 + b.answers.length), label: "", img: "" }))}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-default-300 px-3 py-1.5 text-xs text-default-500 hover:border-primary hover:text-primary"
        >
          <Plus size={12} /> เพิ่มตัวเลือก
        </button>
      </div>

      <div className="space-y-1.5">
        <Label>ข้อความ Feedback (แสดงหลังตอบ)</Label>
        <Input
          value={block.feedback}
          onChange={(e) => set((b) => (b.feedback = e.target.value))}
          placeholder="(ไม่บังคับ)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>จำนวนครั้งที่ตอบได้</Label>
          <Input
            type="number"
            min={1}
            value={block.maxSubmissions}
            onChange={(e) => set((b) => (b.maxSubmissions = Number(e.target.value) || 1))}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="poll-private"
            checked={block.privateResults}
            onChange={(e) => set((b) => (b.privateResults = e.target.checked))}
          />
          <label htmlFor="poll-private" className="text-sm">ซ่อนผลโหวต (Private results)</label>
        </div>
      </div>
    </div>
  );
}

function OraView({ block }: { block: OraBlock }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        <p className="font-semibold">Open Response Assessment (Pass-through)</p>
        <p className="mt-1 text-xs text-rose-600">
          block นี้ถูก import มาจาก Open edX และจะถูก export กลับไปในรูปแบบ XML เดิม ไม่รองรับการแก้ไขใน Builder
        </p>
      </div>

      {block.assessmentTypes.length > 0 && (
        <div className="space-y-1.5">
          <Label>ประเภทการประเมิน</Label>
          <div className="flex flex-wrap gap-1.5">
            {block.assessmentTypes.map((t) => (
              <span key={t} className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {(block.submissionStart || block.submissionDue) && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {block.submissionStart && (
            <div className="space-y-0.5">
              <Label>เปิดรับส่งงาน</Label>
              <p className="font-mono text-default-600">{block.submissionStart}</p>
            </div>
          )}
          {block.submissionDue && (
            <div className="space-y-0.5">
              <Label>ปิดรับส่งงาน</Label>
              <p className="font-mono text-default-600">{block.submissionDue}</p>
            </div>
          )}
        </div>
      )}

      {block.hasFileUpload && (
        <p className="text-xs text-default-500">📎 กำหนดให้นักศึกษาแนบไฟล์</p>
      )}

      <div className="space-y-1.5">
        <Label>Raw XML (read-only)</Label>
        <Textarea
          rows={8}
          readOnly
          className="!font-mono !text-xs opacity-60"
          value={block.rawXml}
        />
      </div>
    </div>
  );
}

function LibraryContentView({ block }: { block: LibraryContentBlock }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        <p className="font-semibold">Library Content (Pass-through)</p>
        <p className="mt-1 text-xs text-teal-600">
          block นี้ดึงโจทย์แบบสุ่มจาก Content Library — จะ export กลับในรูปแบบ XML เดิม
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Source Library ID</Label>
        <p className="rounded-md border border-default-200 bg-default-50 px-3 py-2 font-mono text-xs text-default-700">
          {block.sourceLibraryId || "(ไม่ระบุ)"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>จำนวนข้อที่สุ่ม (max_count)</Label>
        <p className="text-sm font-semibold">{block.maxCount} ข้อ</p>
      </div>

      <div className="space-y-1.5">
        <Label>Raw XML (read-only)</Label>
        <Textarea
          rows={6}
          readOnly
          className="!font-mono !text-xs opacity-60"
          value={block.rawXml}
        />
      </div>
    </div>
  );
}

function UnknownView({ block }: { block: UnknownBlock }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-semibold">Unknown Block: <span className="font-mono">{block.blockType}</span></p>
        <p className="mt-1 text-xs text-slate-500">
          block นี้ไม่รองรับการแก้ไข — จะ export กลับในรูปแบบ XML เดิม
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Raw XML (read-only)</Label>
        <Textarea
          rows={8}
          readOnly
          className="!font-mono !text-xs opacity-60"
          value={block.rawXml}
        />
      </div>
    </div>
  );
}
