"use client";

import { zip, writeText as strToU8 } from "../io/zip";
import { stringify as stringifyToml } from "smol-toml";
import { buildHtmlBlock } from "../olx/block-html";
import { buildProblemBlock } from "../olx/block-problem";
import { buildVideoBlock } from "../olx/block-video";
import { buildDiscussionBlock } from "../olx/block-discussion";
import { buildLtiBlock } from "../olx/block-lti";
import { buildPollBlock } from "../olx/block-poll";
import { buildOraBlockFile } from "../olx/block-ora";
import { buildLibraryContentBlockFile } from "../olx/block-library-content";
import { buildUnknownBlockFile } from "../olx/block-unknown";
import {
  isContainer,
  isXBlock,
  type Library,
  type LibraryEntity,
} from "./schema";
import type { Block } from "../schema";
import { downloadBlob } from "../download";

export interface LibraryExportWarnings {
  warnings: string[];
}

// Walks the library and reports issues that would break Ulmo import.
// Returns the same library (possibly with auto-cleaned children) plus warning strings.
function validateAndClean(library: Library): { library: Library; warnings: string[] } {
  const warnings: string[] = [];
  const validKeys = new Set(library.entities.map((e) => e.key));
  const cleaned = structuredClone(library);

  // 1. Strip dangling children refs from containers
  for (const e of cleaned.entities) {
    if (!isContainer(e)) continue;
    const before = e.children.length;
    e.children = e.children.filter((k) => {
      if (validKeys.has(k)) return true;
      warnings.push(`Container "${e.title}": ลบ reference ของ entity ที่ไม่มีอยู่ "${k}"`);
      return false;
    });
    if (e.children.length !== before) {
      // tracked above
    }
  }

  // 2. Strip dangling entity refs from collections
  for (const c of cleaned.collections) {
    const before = c.entities.length;
    c.entities = c.entities.filter((k) => {
      if (validKeys.has(k)) return true;
      warnings.push(`Collection "${c.title}": ลบ reference ของ entity ที่ไม่มีอยู่ "${k}"`);
      return false;
    });
    if (c.entities.length !== before) {
      // tracked above
    }
  }

  // 3. Detect duplicate entity keys (would corrupt zip)
  const seen = new Set<string>();
  for (const e of cleaned.entities) {
    if (seen.has(e.key)) {
      warnings.push(`Entity key ซ้ำ: "${e.key}" — Ulmo จะ reject`);
    }
    seen.add(e.key);
  }

  // 4. Sanity check: blank required fields
  if (!cleaned.learningPackage.title.trim()) {
    warnings.push(`Library title ว่าง — กรุณากรอกชื่อ Library ใน Library Info`);
  }
  if (!/^lib:[^:]+:[^:]+$/.test(cleaned.learningPackage.key)) {
    warnings.push(`Library key "${cleaned.learningPackage.key}" ไม่ตรงรูปแบบ lib:Org:Code — Ulmo อาจ reject`);
  }

  return { library: cleaned, warnings };
}

export interface LibraryExportInput {
  library: Library;
  assets?: Map<string, File>;            // key = "<uuid>/<filename>"
}

// Serialise an inner OLX block back to a single XML string (the body of block.xml)
function blockToXml(block: Block, uuid: string): string {
  switch (block.type) {
    case "html": {
      // Library v2 stores html inline rather than via a filename pointer.
      // We inline the pointer + html content as a self-contained <html> body.
      const { htmlContent } = buildHtmlBlock(block, uuid);
      const escaped = htmlContent.replace(/]]>/g, "]]]]><![CDATA[>");
      return `<html display_name="${escapeAttr(block.displayName)}"><![CDATA[${escaped}]]></html>\n`;
    }
    case "problem":         return buildProblemBlock(block);
    case "video":           return buildVideoBlock(block, uuid);
    case "discussion":      return buildDiscussionBlock(block, uuid);
    case "lti":             return buildLtiBlock(block, uuid);
    case "poll":            return buildPollBlock(block, uuid);
    case "ora":             return buildOraBlockFile(block, uuid);
    case "library_content": return buildLibraryContentBlockFile(block, uuid);
    case "unknown":         return buildUnknownBlockFile(block, uuid);
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function isoNow(): string {
  return new Date().toISOString();
}

function entityFileSlug(e: LibraryEntity): string {
  // For containers: use the key directly. For xblocks: not stored in entities/<slug>.toml
  return e.key;
}

// Build the package.toml content as TOML string.
// Ulmo's importer rejects empty strings for meta.created_by / created_by_email /
// origin_server with "This field may not be blank.", so we substitute safe
// placeholders when the user hasn't provided values. Description is allowed to
// be blank. Email goes through a separate validator because Ulmo also runs
// Django's EmailField check ("Enter a valid email address.").
function nonBlank(s: string | undefined, fallback: string): string {
  return s && s.trim() ? s : fallback;
}

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeEmail(s: string | undefined): string {
  const trimmed = s?.trim();
  if (trimmed && VALID_EMAIL.test(trimmed)) return trimmed;
  // .invalid is the IANA-reserved TLD for "guaranteed not to exist" — passes
  // RFC 5322 / Django EmailField but won't collide with a real address.
  return "olx-builder@example.invalid";
}

function buildPackageToml(lib: Library): string {
  const obj = {
    meta: {
      format_version: lib.meta.formatVersion,
      created_by: nonBlank(lib.meta.createdBy, "olx-builder"),
      created_by_email: safeEmail(lib.meta.createdByEmail),
      created_at: lib.meta.createdAt ?? isoNow(),
      origin_server: nonBlank(lib.meta.originServer, "olx-builder.local"),
    },
    learning_package: {
      title: lib.learningPackage.title,
      key: lib.learningPackage.key,
      description: lib.learningPackage.description,
      created: lib.learningPackage.created ?? isoNow(),
      updated: isoNow(),
    },
  };
  return stringifyToml(obj) + "\n";
}

function buildContainerToml(e: Extract<LibraryEntity, { kind: "container" }>): string {
  const obj: Record<string, unknown> = {
    entity: {
      can_stand_alone: e.canStandAlone,
      key: e.key,
      created: e.created ?? isoNow(),
      draft: { version_num: e.draftVersion },
      published: { version_num: e.publishedVersion },
      container: { [e.containerKind]: {} },
    },
    version: [
      {
        title: e.title,
        version_num: e.draftVersion,
        container: { children: e.children },
      },
    ],
  };
  return stringifyToml(obj) + "\n";
}

function buildXBlockToml(e: Extract<LibraryEntity, { kind: "xblock" }>): string {
  const obj: Record<string, unknown> = {
    entity: {
      can_stand_alone: e.canStandAlone,
      key: e.key,
      created: e.created ?? isoNow(),
      draft: { version_num: e.draftVersion },
      published: { version_num: e.publishedVersion },
    },
    version: [
      {
        title: e.title,
        version_num: e.draftVersion,
      },
    ],
  };
  return stringifyToml(obj) + "\n";
}

function buildCollectionToml(c: Library["collections"][number]): string {
  const obj = {
    collection: {
      title: c.title,
      key: c.key,
      description: c.description,
      created: c.created ?? isoNow(),
      entities: c.entities,
    },
  };
  return stringifyToml(obj) + "\n";
}

// Build the .zip — async variant resolves File assets into Uint8Array before zipping.
// Returns both the zip bytes and any validation warnings (e.g. dangling refs we stripped).
export async function buildLibraryZipAsync(
  { library, assets }: LibraryExportInput,
): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  const files: Record<string, Uint8Array> = {};

  const { library: cleaned, warnings } = validateAndClean(library);
  library = cleaned;

  files["package.toml"] = strToU8(buildPackageToml(library));

  for (const c of library.collections) {
    files[`collections/${c.key}.toml`] = strToU8(buildCollectionToml(c));
  }

  for (const e of library.entities) {
    if (isContainer(e)) {
      files[`entities/${entityFileSlug(e)}.toml`] = strToU8(buildContainerToml(e));
    } else if (isXBlock(e)) {
      const base = `entities/xblock.v1/${e.xblockType}/${e.uuid}`;
      files[`${base}.toml`] = strToU8(buildXBlockToml(e));
      const versionDir = `${base}/component_versions/v${e.draftVersion}`;
      files[`${versionDir}/block.xml`] = strToU8(blockToXml(e.block, e.uuid));

      if (assets) {
        const prefix = `${e.uuid}/`;
        for (const [k, file] of assets) {
          if (!k.startsWith(prefix)) continue;
          const fname = k.slice(prefix.length);
          if (!fname) continue;
          const buf = new Uint8Array(await file.arrayBuffer());
          files[`${versionDir}/static/${fname}`] = buf;
        }
      }
    }
  }

  return { bytes: zip(files, 6), warnings };
}

export async function downloadLibraryZip(library: Library, assets?: Map<string, File>): Promise<string[]> {
  const { bytes, warnings } = await buildLibraryZipAsync({ library, assets });
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: "application/zip" });
  const slug = library.learningPackage.key.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  downloadBlob(blob, `${slug}-${new Date().toISOString().slice(0, 10)}.zip`);
  return warnings;
}
