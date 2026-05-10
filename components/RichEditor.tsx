"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useEffect, useRef, useState } from "react";
import type { Editor as TinyMCEEditor } from "tinymce";
import type { AssetFile } from "./AssetUploader";

type Props = {
  value: string;
  onChange: (html: string) => void;
  height?: number;
  assets: Map<string, AssetFile>;
  onAddAsset: (file: File, suggestedName?: string) => string;
};

type BlobInfo = {
  blob: () => Blob;
  filename?: () => string;
};

export function RichEditor({ value, onChange, height = 420, assets, onAddAsset }: Props) {
  const editorRef = useRef<TinyMCEEditor | null>(null);
  // blob URL -> canonical asset filename (kept across renders for handleChange lookups)
  const blobToName = useRef<Map<string, string>>(new Map());
  const [displayHtml, setDisplayHtml] = useState("");

  // Build display HTML in effect: replace asset://name with fresh blob URLs.
  // Track URLs to revoke on next pass / unmount.
  useEffect(() => {
    const map = blobToName.current;
    const created: string[] = [];
    const next = value.replace(/asset:\/\/([A-Za-z0-9_.\-/]+)/g, (m, name: string) => {
      const a = assets.get(name);
      if (!a) return m;
      const url = URL.createObjectURL(a.blob);
      map.set(url, name);
      created.push(url);
      return url;
    });
    setDisplayHtml(next);
    return () => {
      for (const u of created) {
        URL.revokeObjectURL(u);
        map.delete(u);
      }
    };
  }, [value, assets]);

  const handleChange = (html: string) => {
    const out = html.replace(/blob:[^\s"')]+/g, (url) => {
      const fn = blobToName.current.get(url);
      return fn ? `asset://${fn}` : url;
    });
    if (out !== value) onChange(out);
  };

  const uploadHandler = (blobInfo: BlobInfo) =>
    new Promise<string>((resolve, reject) => {
      try {
        const blob = blobInfo.blob();
        const fname =
          blobInfo.filename?.() ||
          (blob as File).name ||
          `image-${Date.now()}.${(blob.type.split("/")[1] || "png").replace("jpeg", "jpg")}`;
        const realFile = blob instanceof File ? blob : new File([blob], fname, { type: blob.type });
        const stored = onAddAsset(realFile, fname);
        const url = URL.createObjectURL(realFile);
        blobToName.current.set(url, stored);
        resolve(url);
      } catch (e) {
        reject(e instanceof Error ? e.message : String(e));
      }
    });

  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      licenseKey="gpl"
      onInit={(_e, editor) => {
        editorRef.current = editor;
      }}
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
        automatic_uploads: true,
        images_upload_handler: uploadHandler,
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
