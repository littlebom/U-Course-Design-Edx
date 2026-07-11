"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useEffect, useRef } from "react";
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

const ASSET_RE = /asset:\/\/([A-Za-z0-9_.\-/]+)/g;

export function RichEditor({ value, onChange, height = 420, assets, onAddAsset }: Props) {
  const editorRef = useRef<TinyMCEEditor | null>(null);
  // blob URL -> canonical asset filename (for mapping edited HTML back to asset://)
  const blobToName = useRef<Map<string, string>>(new Map());
  const createdUrls = useRef<string[]>([]);

  // Build the editor's initial content ONCE per mount: asset://name -> blob URL.
  //
  // The editor is intentionally UNCONTROLLED (initialValue, not value): edits flow
  // OUT via onEditorChange -> onChange (updating parent state for autosave/export),
  // but parent state is never fed back INTO TinyMCE. Driving it as a controlled
  // component re-generated fresh blob URLs on every value change, which made TinyMCE
  // re-fire onEditorChange, whose normalized output never equalled `value` — an
  // infinite loop ("Maximum update depth exceeded"). Switching to a different block
  // remounts this component via a React key (see BlockEditor), reloading its HTML.
  const initialHtmlRef = useRef<string | null>(null);
  if (initialHtmlRef.current === null) {
    initialHtmlRef.current = value.replace(ASSET_RE, (m, name: string) => {
      const a = assets.get(name);
      if (!a) return m;
      const url = URL.createObjectURL(a.blob);
      blobToName.current.set(url, name);
      createdUrls.current.push(url);
      return url;
    });
  }

  // Revoke every blob URL we created when the editor unmounts.
  useEffect(() => {
    const urls = createdUrls.current;
    const map = blobToName.current;
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
      map.clear();
      urls.length = 0;
    };
  }, []);

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
        createdUrls.current.push(url);
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
      initialValue={initialHtmlRef.current}
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
          "body{font-family:'Sarabun',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;padding:12px}" +
          "code{background:#f3f4f6;padding:2px 4px;border-radius:3px}" +
          "pre{background:#1e293b;color:#f8fafc;padding:12px;border-radius:6px;overflow:auto}",
      }}
    />
  );
}
