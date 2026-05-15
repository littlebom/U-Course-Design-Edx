"use client";

import { useCallback, useImperativeHandle, forwardRef } from "react";
import { useDropzone } from "react-dropzone";
import { type Course } from "@/lib/schema";
import { parseOlxTar } from "@/lib/olxTarParse";

type Props = {
  onLoad: (course: Course, warnings: string[], assets: Map<string, File>) => void;
  onError: (msg: string) => void;
};

export type OlxDropzoneHandle = { open: () => void };

export const OlxDropzone = forwardRef<OlxDropzoneHandle, Props>(function OlxDropzone(
  { onLoad, onError },
  ref,
) {
  const onDrop = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      try {
        const buffer = await f.arrayBuffer();
        const { course, warnings, assets } = await parseOlxTar(buffer);
        onLoad(course, warnings, assets);
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
      }
    },
    [onLoad, onError],
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: {
      "application/gzip": [".gz", ".tar.gz"],
      "application/x-tar": [".tar"],
    },
    multiple: false,
    noClick: true,
  });

  useImperativeHandle(ref, () => ({ open }), [open]);

  return (
    <div {...getRootProps()} className="hidden">
      <input {...getInputProps()} />
    </div>
  );
});
