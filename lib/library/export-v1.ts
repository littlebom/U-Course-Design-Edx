"use client";

import { tarGz } from "../io/tar";
import { buildHtmlBlock } from "../olx/block-html";
import { buildProblemBlock } from "../olx/block-problem";
import { buildVideoBlock } from "../olx/block-video";
import { isContainer, isXBlock, type Library } from "./schema";
import type { HtmlBlock, ProblemBlock, VideoBlock } from "../schema";
import { downloadBlob } from "../download";

// Block types a legacy (v1) content library can hold. Containers, collections,
// and richer xblock types (ora/lti/poll/library_content) have no v1 equivalent.
const V1_SAFE = new Set(["problem", "html", "video"]);

// v2 uuid (dashed) → v1 32-hex url_name. Reverse of import-v1's hexToUuid.
function uuidToHex(uuid: string): string {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  return /^[0-9a-f]{32}$/.test(hex) ? hex : hex.padEnd(32, "0").slice(0, 32);
}

// lib:Org:Slug → { org, library }. Falls back to filename-safe defaults.
function parseLibraryKey(key: string): { org: string; library: string } {
  const m = /^lib:([^:]+):(.+)$/.exec(key);
  if (m) return { org: m[1], library: m[2] };
  return { org: "LIB", library: key.replace(/[^A-Za-z0-9_.-]+/g, "_") || "library" };
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeDir(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "") || "library";
}

export interface LibraryV1ExportResult {
  bytes: Uint8Array;
  warnings: string[];
}

// Build a legacy Content Library v1 .tar.gz (importable into Open edX Studio's
// legacy library, e.g. Redwood). Structure mirrors what Studio exports and what
// parseLibraryV1Tar reads:
//   <slug>/library.xml               <library org=".." library=".." ...> with
//                                    flat <problem url_name="hex"/> pointers
//   <slug>/problem/<hex>.xml         full problem OLX
//   <slug>/html/<hex>.xml + .html    pointer + content
//   <slug>/video/<hex>.xml
//   <slug>/static/<file>             shared assets
export async function buildLibraryV1TarGz(
  library: Library,
  assets?: Map<string, File>,
): Promise<LibraryV1ExportResult> {
  const warnings: string[] = [];
  const enc = new TextEncoder();
  const { org, library: slug } = parseLibraryKey(library.learningPackage.key);
  const root = safeDir(slug);
  const files: Record<string, Uint8Array> = {};
  const childEls: string[] = [];

  // v1 is a flat list — containers/collections have no equivalent.
  const containers = library.entities.filter(isContainer);
  if (containers.length) {
    warnings.push(
      `V1 ไม่รองรับ container — flatten ${containers.length} รายการ (เอาเฉพาะบล็อกภายใน, ทิ้งลำดับชั้น)`,
    );
  }
  if (library.collections.length) {
    warnings.push(`V1 ไม่รองรับ collection — ${library.collections.length} รายการจะไม่ถูก export`);
  }

  // Track which static/<file> we've written to catch cross-block collisions.
  const staticWritten = new Map<string, string>(); // filename -> source uuid
  const referencedAssets: { name: string; uuid: string }[] = [];

  for (const e of library.entities) {
    if (!isXBlock(e)) continue;
    const tag = e.xblockType;
    const urlName = uuidToHex(e.uuid);

    if (!V1_SAFE.has(tag)) {
      warnings.push(`ข้ามบล็อกชนิด "${tag}" (${e.title}) — v1 library รองรับเฉพาะ problem / html / video`);
      continue;
    }

    if (tag === "problem") {
      const xml = buildProblemBlock(e.block as ProblemBlock);
      files[`${root}/problem/${urlName}.xml`] = enc.encode(xml);
      childEls.push(`  <problem url_name="${urlName}"/>`);
      if (/asset:\/\//.test(xml)) {
        warnings.push(`บล็อก "${e.title}" อ้างรูปแบบ asset:// ในโจทย์ — v1 export ยังไม่รวมรูปในโจทย์ให้อัตโนมัติ`);
      }
    } else if (tag === "html") {
      const { pointerXml, htmlContent, assetRefs } = buildHtmlBlock(e.block as HtmlBlock, urlName);
      files[`${root}/html/${urlName}.xml`] = enc.encode(pointerXml);
      files[`${root}/html/${urlName}.html`] = enc.encode(htmlContent);
      childEls.push(`  <html url_name="${urlName}"/>`);
      for (const ref of assetRefs) referencedAssets.push({ name: ref, uuid: e.uuid });
    } else if (tag === "video") {
      files[`${root}/video/${urlName}.xml`] = enc.encode(buildVideoBlock(e.block as VideoBlock, urlName));
      childEls.push(`  <video url_name="${urlName}"/>`);
    }
  }

  // Collect referenced static assets into <slug>/static/<filename>.
  // v2 assets are keyed "<uuid>/<filename>"; v1 shares one static/ dir.
  if (assets) {
    for (const { name, uuid } of referencedAssets) {
      const base = name.split("/").pop() || name;
      const target = `${root}/static/${base}`;
      const owner = staticWritten.get(base);
      if (owner && owner !== uuid) {
        warnings.push(`ไฟล์ static ชื่อซ้ำ "${base}" จากหลายบล็อก — ใช้ไฟล์แรก อาจแสดงผิด`);
        continue;
      }
      if (owner) continue; // same block already wrote it
      const file =
        assets.get(`${uuid}/${name}`) ??
        assets.get(`shared/${name}`) ??
        [...assets.entries()].find(([k]) => k.endsWith(`/${name}`))?.[1];
      if (!file) {
        warnings.push(`ไม่พบไฟล์ asset "${name}" ที่บล็อกอ้างถึง — ลิงก์รูปอาจเสีย`);
        continue;
      }
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        files[target] = buf;
        staticWritten.set(base, uuid);
      } catch {
        warnings.push(`อ่านไฟล์ asset "${name}" ไม่สำเร็จ — ข้าม`);
      }
    }
  }

  if (childEls.length === 0) {
    warnings.push("ไม่มีบล็อกที่ export ได้ (v1 รองรับเฉพาะ problem/html/video)");
  }

  const libXml =
    `<?xml version="1.0"?>\n` +
    `<library org="${escapeAttr(org)}" library="${escapeAttr(slug)}" ` +
    `display_name="${escapeAttr(library.learningPackage.title || "Library")}">\n` +
    `${childEls.join("\n")}\n` +
    `</library>\n`;
  files[`${root}/library.xml`] = enc.encode(libXml);

  return { bytes: tarGz(files), warnings };
}

export async function downloadLibraryV1TarGz(
  library: Library,
  assets?: Map<string, File>,
): Promise<string[]> {
  const { bytes, warnings } = await buildLibraryV1TarGz(library, assets);
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: "application/gzip" });
  const slug = library.learningPackage.key.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  downloadBlob(blob, `${slug}-v1-${new Date().toISOString().slice(0, 10)}.tar.gz`);
  return warnings;
}
