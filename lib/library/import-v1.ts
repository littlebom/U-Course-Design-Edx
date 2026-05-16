"use client";

import { extractTar, getXml, attr } from "../olx/import/tar";
import { walkFlatBlocks } from "../olx/import/walk-flat-blocks";
import {
  librarySchema,
  type Library,
  type LibraryEntity,
  type LibraryXBlock,
  type Block,
} from "./schema";

export interface LibraryV1ImportResult {
  library: Library;
  warnings: string[];
  assets: Map<string, File>;
  stats: {
    blockCount: number;
    skippedCount: number;
  };
}

export type V1WrapMode = "flat" | "single-section";

// Convert a 32-char hex (Sumac/v1 url_name) into a UUID-v4-shaped string with dashes
// so the resulting Library v2 has well-formed UUIDs Ulmo expects.
function hexToUuid(hex: string): string {
  if (/^[0-9a-f]{32}$/i.test(hex)) {
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
  }
  // Not a 32-hex — fall back to a fresh UUID v4
  return globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
}

// Parse a Library v1 .tar.gz export and convert it into a Library v2 model.
// Inner block XML (problem/html/video) is reused via the existing parseBlockFile.
export async function parseLibraryV1Tar(
  buffer: ArrayBuffer,
  opts: { wrapMode?: V1WrapMode } = {},
): Promise<LibraryV1ImportResult> {
  const warnings: string[] = [];
  const assets = new Map<string, File>();
  const wrapMode: V1WrapMode = opts.wrapMode ?? "flat";

  const files = await extractTar(buffer);

  // ── library.xml ──────────────────────────────────────────────────────────
  const libEl = getXml(files, "library.xml");
  if (!libEl) throw new Error("ไม่พบ library/library.xml — ไฟล์อาจไม่ใช่ Library v1");

  const displayName = attr(libEl, "display_name") || "Imported Library";
  const org = attr(libEl, "org") || "UNKNOWN";
  const library = attr(libEl, "library") || `imported-${Date.now()}`;
  const v2Key = `lib:${org}:${library}`;

  // ── Walk children of <library> (flat: <problem url_name>, <html url_name>, …) ─
  // Re-uses the same flat walker the v2 importer would use.
  const parsedBlocks = walkFlatBlocks(libEl, files, warnings);
  const xblocks: LibraryXBlock[] = parsedBlocks.map(({ tag, urlName, block: parsed }) => {
    const block = parsed as Block & { displayName?: string };
    const uuid = hexToUuid(urlName);
    return {
      kind: "xblock",
      key: `xblock.v1:${tag}:${uuid}`,
      title: block.displayName || tag,
      xblockType: tag,
      uuid,
      draftVersion: 1,
      publishedVersion: 1,
      canStandAlone: true,
      created: new Date().toISOString(),
      block,
    };
  });
  // Skipped = direct children that had a usable url_name but failed to parse
  const childCount = Array.from(libEl.children).filter(
    (c) => !c.tagName.includes(":") && attr(c, "url_name"),
  ).length;
  const skipped = childCount - xblocks.length;

  // ── Optional wrap: create one Section container holding everything ───────
  const entities: LibraryEntity[] = [...xblocks];
  if (wrapMode === "single-section" && xblocks.length > 0) {
    const sectionKey = `section-imported-from-v1`;
    entities.unshift({
      kind: "container",
      key: sectionKey,
      title: `Imported from v1 — ${displayName}`,
      containerKind: "section",
      draftVersion: 1,
      publishedVersion: 1,
      canStandAlone: true,
      created: new Date().toISOString(),
      children: xblocks.map((x) => x.key),
    });
  }

  // ── Static assets — copy any static/* files into the asset map (per uuid keyed) ─
  // Library v1 stores shared static/ files, not per-block; we re-key as "shared/<filename>"
  // so the future v2 exporter can reference them.
  for (const [path, entry] of files) {
    if (!path.startsWith("static/")) continue;
    const fileName = path.slice("static/".length);
    if (!fileName) continue;
    const buf = new Uint8Array(entry.binary).buffer as ArrayBuffer;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
      gif: "image/gif", svg: "image/svg+xml", srt: "text/plain", vtt: "text/vtt",
    };
    const mime = mimeMap[ext] ?? "application/octet-stream";
    assets.set(`shared/${fileName}`, new File([buf], fileName, { type: mime }));
  }

  // ── Assemble Library v2 ──────────────────────────────────────────────────
  const raw = {
    meta: {
      formatVersion: 1,
      createdBy: "u-coursebuilder (v1 import)",
      createdByEmail: "",
      createdAt: new Date().toISOString(),
      originServer: "",
    },
    learningPackage: {
      title: displayName,
      key: v2Key,
      description: `อัปเกรดจาก Library v1 (${org}/${library}) เมื่อ ${new Date().toLocaleString("th-TH")}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
    entities,
    collections: [],
  };

  const result = librarySchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Library schema ไม่ถูกต้อง: ${result.error.issues[0]?.message ?? "unknown"}`);
  }

  if (skipped > 0) {
    warnings.push(`ข้าม ${skipped} block ที่ parse ไม่สำเร็จ`);
  }
  if (xblocks.length === 0) {
    warnings.push(`ไม่พบ block ใน library — ตรวจสอบว่าไฟล์ tar.gz ถูกต้อง`);
  }

  return {
    library: result.data,
    warnings,
    assets,
    stats: { blockCount: xblocks.length, skippedCount: skipped },
  };
}
