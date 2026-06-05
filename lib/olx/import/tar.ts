"use client";

import { strFromU8 } from "fflate";
import { untarGz, type TarEntry } from "../../io/tar";
import { unzip } from "../../io/zip";

export type { TarEntry };

// Extract files from a .tar.gz into a Map<path, TarEntry>.
// Wrapper around the shared io/tar helper kept async for back-compat with
// existing callers.
export async function extractTar(buffer: ArrayBuffer): Promise<Map<string, TarEntry>> {
  return untarGz(buffer);
}

// Detect a single top-level directory shared by EVERY path (e.g. "library/").
// Returns "" when files sit at the root or wrappers differ — so we never strip
// a real content folder like "static/".
function commonWrapper(paths: string[]): string {
  let prefix: string | null = null;
  for (const p of paths) {
    const slash = p.indexOf("/");
    if (slash === -1) return ""; // a file at root → no common wrapper
    const seg = p.slice(0, slash + 1);
    if (prefix === null) prefix = seg;
    else if (prefix !== seg) return "";
  }
  return prefix ?? "";
}

// Extract a .zip into the same Map<path, TarEntry> shape untarGz produces:
// strip one common wrapper dir if present, and skip directory + macOS junk.
function unzipToEntries(buffer: ArrayBuffer): Map<string, TarEntry> {
  const raw = unzip(buffer);
  const paths = Object.keys(raw).filter(
    (p) => !p.endsWith("/") && !p.startsWith("__MACOSX/") && !p.endsWith(".DS_Store"),
  );
  const strip = commonWrapper(paths);
  const files = new Map<string, TarEntry>();
  for (const p of paths) {
    const binary = raw[p];
    const normalized = strip && p.startsWith(strip) ? p.slice(strip.length) : p;
    if (!normalized) continue;
    files.set(normalized, { text: strFromU8(binary), binary });
  }
  return files;
}

// Format-agnostic archive extractor for OLX bundles. Sniffs magic bytes and
// handles BOTH .zip ("PK") and .tar.gz (gzip 1f 8b) — Library v1 exports ship
// as either depending on the Studio version. Falls back to tar.gz.
export function extractArchive(buffer: ArrayBuffer): Map<string, TarEntry> {
  const head = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
  if (head[0] === 0x50 && head[1] === 0x4b) return unzipToEntries(buffer); // "PK" → zip
  return untarGz(buffer); // gzip (1f 8b) or fallback
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
