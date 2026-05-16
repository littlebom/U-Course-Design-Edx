"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Image as ImageIcon, Upload, Trash2, Copy, FileText } from "lucide-react";
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
          <code className="rounded bg-muted px-1 text-2xs">asset://&lt;ชื่อไฟล์&gt;</code>
        </span>
      </div>

      {assets.size === 0 ? (
        <div className="text-center text-xs text-muted-foreground">ยังไม่มีไฟล์</div>
      ) : (
        <ul className="space-y-1">
          {[...assets.values()].map((a) => (
            <AssetRow key={a.name} asset={a} onCopy={copyRef} onRemove={remove} />
          ))}
        </ul>
      )}
    </div>
  );
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

function AssetRow({
  asset,
  onCopy,
  onRemove,
}: {
  asset: AssetFile;
  onCopy: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const isImage = IMAGE_TYPES.includes(asset.blob.type) ||
    /\.(jpe?g|png|webp|gif|svg)$/i.test(asset.name);

  // Creating a blob URL is the canonical "sync state with external resource" use of
  // useEffect — we own the URL lifetime and revoke it on cleanup. Lint rule mis-flags this.
  useEffect(() => {
    if (!isImage) return;
    const objectUrl = URL.createObjectURL(asset.blob);
    urlRef.current = objectUrl;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => { URL.revokeObjectURL(objectUrl); urlRef.current = null; };
  }, [asset.blob, isImage]);

  return (
    <li className="group flex items-center gap-2 rounded-md border border-default-200 bg-card px-2 py-1.5 text-xs shadow-base transition-colors hover:border-default-300">
      {isImage && url ? (
        <img
          src={url}
          alt={asset.name}
          className="size-8 shrink-0 rounded object-cover border border-default-200"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded bg-default-100 text-default-400">
          {isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium leading-tight" title={asset.name}>
          {asset.name}
        </span>
        <span className="text-2xs text-muted-foreground">{fmtSize(asset.size)}</span>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="!h-6 !w-6 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={() => onCopy(asset.name)}
        title="คัดลอก asset://"
      >
        <Copy size={11} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        color="destructive"
        className="!h-6 !w-6 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={() => onRemove(asset.name)}
        title="ลบ"
      >
        <Trash2 size={11} />
      </Button>
    </li>
  );
}

function fmtSize(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}
