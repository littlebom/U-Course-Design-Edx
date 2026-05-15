"use client";

import pako from "pako";

export type TarEntry = { text: string; binary: Uint8Array };

// Extract files from a .tar.gz into a Map<path, TarEntry>
export async function extractTar(buffer: ArrayBuffer): Promise<Map<string, TarEntry>> {
  const files = new Map<string, TarEntry>();
  const decompressed = pako.ungzip(new Uint8Array(buffer));

  let offset = 0;
  const dec = new TextDecoder();

  while (offset + 512 <= decompressed.length) {
    const header = decompressed.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    const name = dec.decode(header.subarray(0, 100)).replace(/\0/g, "").trim();
    const sizeOctal = dec.decode(header.subarray(124, 136)).replace(/\0/g, "").trim();
    const typeflag = dec.decode(header.subarray(156, 157)).replace(/\0/g, "").trim();

    const size = parseInt(sizeOctal, 8) || 0;
    offset += 512;

    if (typeflag === "" || typeflag === "0") {
      const binary = decompressed.slice(offset, offset + size);
      const text = dec.decode(binary);
      const normalized = name.replace(/^\.\//, "").replace(/^\S+?\//, "");
      files.set(normalized, { text, binary });
    }

    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}

export function getXml(files: Map<string, TarEntry>, path: string): Element | null {
  const entry = files.get(path);
  if (!entry) return null;
  const doc = new DOMParser().parseFromString(entry.text, "application/xml");
  const err = doc.querySelector("parseerror, parsererror");
  if (err) return null;
  return doc.documentElement;
}

export function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? "";
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
