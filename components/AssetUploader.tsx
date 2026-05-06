"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Image as ImageIcon, Upload, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AssetFile = { name: string; size: number; blob: Blob };

type Props = {
  assets: Map<string, AssetFile>;
  onChange: (next: Map<string, AssetFile>) => void;
};

export function AssetUploader({ assets, onChange }: Props) {
  const onDrop = useCallback(
    async (files: File[]) => {
      const next = new Map(assets);
      for (const f of files) next.set(f.name, { name: f.name, size: f.size, blob: f });
      onChange(next);
    },
    [assets, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const remove = (name: string) => {
    const next = new Map(assets);
    next.delete(name);
    onChange(next);
  };

  const copyRef = (name: string) => navigator.clipboard?.writeText(`asset://${name}`);

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed bg-background px-3 py-4 text-xs transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-default-300 hover:border-primary/60",
        )}
      >
        <input {...getInputProps()} />
        <Upload size={18} className="text-default-400" />
        <span className="text-center text-default-600">
          ลากไฟล์ที่นี่ — อ้างใน HTML ด้วย
          <br />
          <code className="rounded bg-muted px-1 text-[11px]">asset://&lt;ชื่อไฟล์&gt;</code>
        </span>
      </div>

      {assets.size === 0 ? (
        <div className="text-center text-xs text-muted-foreground">ยังไม่มีไฟล์</div>
      ) : (
        <ul className="space-y-1">
          {[...assets.values()].map((a) => (
            <li
              key={a.name}
              className="group flex items-center gap-2 rounded-md border border-default-200 bg-card px-2 py-1.5 text-xs shadow-base transition-colors"
            >
              <span className="grid size-6 place-items-center rounded bg-info/10 text-info">
                <ImageIcon size={12} />
              </span>
              <span className="flex-1 truncate font-medium" title={a.name}>
                {a.name}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{fmtSize(a.size)}</span>
              <Button
                size="icon"
                variant="ghost"
                className="!h-6 !w-6 opacity-0 group-hover:opacity-100"
                onClick={() => copyRef(a.name)}
                title="คัดลอก asset://"
              >
                <Copy size={11} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                color="destructive"
                className="!h-6 !w-6 opacity-0 group-hover:opacity-100"
                onClick={() => remove(a.name)}
                title="ลบ"
              >
                <Trash2 size={11} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtSize(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}
