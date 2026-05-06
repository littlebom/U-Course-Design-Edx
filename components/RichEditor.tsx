"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useEffect, useMemo, useRef } from "react";
import type { AssetFile } from "./AssetUploader";

type Props = {
  value: string;
  onChange: (html: string) => void;
  height?: number;
  assets: Map<string, AssetFile>;
  onAddAsset: (file: File, suggestedName?: string) => string;
};

export function RichEditor({ value, onChange, height = 420, assets, onAddAsset }: Props) {
  const editorRef = useRef<any>(null);
  // blob URL -> canonical asset filename
  const blobToName = useRef<Map<string, string>>(new Map());
  // canonical filename -> current blob URL (one per render)
  const nameToBlob = useRef<Map<string, string>>(new Map());

  // Build display HTML: replace asset://name with a fresh blob: URL so TinyMCE can show the image
  const displayHtml = useMemo(() => {
    // Revoke stale URLs from previous render
    for (const u of nameToBlob.current.values()) URL.revokeObjectURL(u);
    nameToBlob.current.clear();

    return value.replace(/asset:\/\/([A-Za-z0-9_.\-/]+)/g, (m, name) => {
      const a = assets.get(name);
      if (!a) return m;
      const url = URL.createObjectURL(a.blob);
      blobToName.current.set(url, name);
      nameToBlob.current.set(name, url);
      return url;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, assets]);

  useEffect(() => {
    return () => {
      for (const u of nameToBlob.current.values()) URL.revokeObjectURL(u);
    };
  }, []);

  const handleChange = (html: string) => {
    // Bubble back: replace blob: URLs with asset://name
    const out = html.replace(/blob:[^\s"')]+/g, (url) => {
      const fn = blobToName.current.get(url);
      return fn ? `asset://${fn}` : url;
    });
    if (out !== value) onChange(out);
  };

  const uploadHandler = (blobInfo: any) =>
    new Promise<string>((resolve, reject) => {
      try {
        const file: Blob = blobInfo.blob();
        const fname: string =
          blobInfo.filename?.() ||
          (file as any).name ||
          `image-${Date.now()}.${(file.type.split("/")[1] || "png").replace("jpeg", "jpg")}`;
        const realFile =
          file instanceof File ? file : new File([file], fname, { type: file.type });
        const stored = onAddAsset(realFile, fname);
        const url = URL.createObjectURL(realFile);
        blobToName.current.set(url, stored);
        nameToBlob.current.set(stored, url);
        resolve(url);
      } catch (e: any) {
        reject(e?.message ?? String(e));
      }
    });

  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      licenseKey="gpl"
      onInit={(_e, editor) => (editorRef.current = editor)}
      value={displayHtml}
      onEditorChange={handleChange}
      init={{
        height,
        menubar: false,
        statusbar: true,
        branding: false,
        promotion: false,
        skin: "oxide",
        content_css: "default",
        plugins: [
          "advlist",
          "autolink",
          "lists",
          "link",
          "image",
          "charmap",
          "preview",
          "anchor",
          "searchreplace",
          "visualblocks",
          "code",
          "fullscreen",
          "insertdatetime",
          "media",
          "table",
          "help",
          "wordcount",
          "codesample",
        ],
        toolbar:
          "undo redo | blocks | bold italic underline strikethrough | " +
          "alignleft aligncenter alignright alignjustify | " +
          "bullist numlist outdent indent | link image media table codesample | " +
          "removeformat | code fullscreen",
        block_formats:
          "Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre; Blockquote=blockquote",
        valid_elements: "*[*]",
        extended_valid_elements: "iframe[src|width|height|frameborder|allowfullscreen|allow]",
        // === Image upload wiring ===
        automatic_uploads: true,
        images_upload_handler: uploadHandler,
        // Allow dropping/pasting images
        paste_data_images: true,
        file_picker_types: "image",
        image_caption: true,
        image_advtab: true,
        image_title: true,
        link_default_target: "_blank",
        urlconverter_callback: (url: string) => url,
        content_style:
          "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;padding:12px}" +
          "code{background:#f3f4f6;padding:2px 4px;border-radius:3px}" +
          "pre{background:#1e293b;color:#f8fafc;padding:12px;border-radius:6px;overflow:auto}",
      }}
    />
  );
}
