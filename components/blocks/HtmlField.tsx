"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Code2, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssetFile } from "../AssetUploader";

const RichEditor = dynamic(
  () => import("../RichEditor").then((m) => ({ default: m.RichEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[420px] place-items-center rounded-md border border-default-200 bg-default-50 text-sm text-default-500">
        กำลังโหลด editor…
      </div>
    ),
  },
);

export function HtmlField({
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
