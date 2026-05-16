"use client";

import { untarGz, type TarEntry } from "../../io/tar";

export type { TarEntry };

// Extract files from a .tar.gz into a Map<path, TarEntry>.
// Wrapper around the shared io/tar helper kept async for back-compat with
// existing callers.
export async function extractTar(buffer: ArrayBuffer): Promise<Map<string, TarEntry>> {
  return untarGz(buffer);
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
