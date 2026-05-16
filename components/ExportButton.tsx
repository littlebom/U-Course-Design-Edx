"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { Course } from "@/lib/schema";
import type { AssetFile } from "./AssetUploader";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/download";

type Props = {
  course: Course;
  assets: Map<string, AssetFile>;
  disabled?: boolean;
};

export function ExportButton({ course, assets, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("course", JSON.stringify(course));
      for (const a of assets.values())
        fd.append(`asset_${a.name}`, new File([a.blob], a.name));
      const res = await fetch("/api/export", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.error === "missing_assets"
            ? `ขาดไฟล์: ${(j.missing as string[]).join(", ")}`
            : j.error ?? `HTTP ${res.status}`,
        );
      }
      const blob = await res.blob();
      downloadBlob(blob, `${course.course.courseCode}-${course.course.run}.tar.gz`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button color="primary" size="sm" onClick={handleExport} disabled={disabled || loading}>
        {loading ? (
          <Loader2 size={14} className="me-1.5 animate-spin" />
        ) : (
          <Download size={14} className="me-1.5" />
        )}
        Export
      </Button>
      {err && <div className="max-w-xs text-right text-2xs text-destructive">{err}</div>}
    </div>
  );
}
