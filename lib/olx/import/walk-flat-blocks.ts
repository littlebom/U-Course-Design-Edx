"use client";

import { attr, type TarEntry } from "./tar";
import { parseBlockFile } from "./parse-block";

// Walk the direct children of a root element (Library v1's <library>, or
// any flat block container) and parse each <tag url_name="..."/> reference
// via the standard parseBlockFile pipeline. Skips namespaced option
// elements (ns0:name, ns8:advanced_modules, …) that don't represent blocks.
//
// Returns the parsed blocks paired with their original tag + url_name so
// callers can wrap them with their own entity metadata.
export interface ParsedFlatBlock {
  tag: string;
  urlName: string;
  block: object;
}

export function walkFlatBlocks(
  rootEl: Element,
  files: Map<string, TarEntry>,
  warnings: string[],
): ParsedFlatBlock[] {
  const out: ParsedFlatBlock[] = [];
  for (const child of Array.from(rootEl.children)) {
    const tag = child.tagName;
    if (tag.includes(":")) continue; // namespaced option element
    const urlName = attr(child, "url_name");
    if (!urlName) continue;
    const parsed = parseBlockFile(tag, urlName, files, warnings);
    if (parsed) out.push({ tag, urlName, block: parsed });
  }
  return out;
}
