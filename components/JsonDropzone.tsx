"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileJson, Upload } from "lucide-react";
import { courseSchema, type Course } from "@/lib/schema";
import { Button } from "@/components/ui/button";

type Props = {
  onLoad: (course: Course) => void;
  onError: (msg: string) => void;
};

export function JsonDropzone({ onLoad, onError }: Props) {
  const onDrop = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const parsed = JSON.parse(text);
        const result = courseSchema.safeParse(parsed);
        if (!result.success) {
          onError(`Schema ไม่ถูกต้อง: ${result.error.issues[0]?.message ?? "unknown"}`);
          return;
        }
        onLoad(result.data);
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
      }
    },
    [onLoad, onError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    multiple: false,
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <Button variant="outline" size="sm" type="button">
        {isDragActive ? (
          <Upload size={14} className="me-1.5 text-primary" />
        ) : (
          <FileJson size={14} className="me-1.5" />
        )}
        {isDragActive ? "วางที่นี่..." : "Import JSON"}
      </Button>
    </div>
  );
}
