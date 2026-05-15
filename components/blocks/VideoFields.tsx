"use client";

import { Plus, Subtitles, Trash2 } from "lucide-react";
import type { VideoBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { parseYoutubeId } from "./parseYoutubeId";
import type { BlockUpdateFn } from "./types";

export function VideoFields({ block, update }: { block: VideoBlock; update: BlockUpdateFn }) {
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
          <p className="text-xs text-default-400">ยังไม่มี transcript — คลิก &quot;เพิ่มภาษา&quot; เพื่อเพิ่ม</p>
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
