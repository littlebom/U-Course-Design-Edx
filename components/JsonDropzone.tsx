"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileCode2, Upload } from "lucide-react";
import { type Course } from "@/lib/schema";
import { parseXmlCourse } from "@/lib/xmlParse";
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
        const course = parseXmlCourse(text);
        onLoad(course);
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
      }
    },
    [onLoad, onError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/xml": [".xml"], "text/xml": [".xml"] },
    multiple: false,
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <Button variant="outline" size="sm" type="button">
        {isDragActive ? (
          <Upload size={14} className="me-1.5 text-primary" />
        ) : (
          <FileCode2 size={14} className="me-1.5" />
        )}
        {isDragActive ? "วางที่นี่..." : "Import XML"}
      </Button>
    </div>
  );
}
