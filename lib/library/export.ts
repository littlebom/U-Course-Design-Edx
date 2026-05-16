"use client";

import { zipSync, strToU8 } from "fflate";
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
// be blank.
function nonBlank(s: string | undefined, fallback: string): string {
  return s && s.trim() ? s : fallback;
}

function buildPackageToml(lib: Library): string {
  const obj = {
    meta: {
      format_version: lib.meta.formatVersion,
      created_by: nonBlank(lib.meta.createdBy, "olx-builder"),
      created_by_email: nonBlank(lib.meta.createdByEmail, "olx-builder@local"),
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

// Build the entire .zip and return its bytes
export function buildLibraryZip({ library, assets }: LibraryExportInput): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  files["package.toml"] = strToU8(buildPackageToml(library));

  // Collections
  for (const c of library.collections) {
    files[`collections/${c.key}.toml`] = strToU8(buildCollectionToml(c));
  }

  // Entities
  for (const e of library.entities) {
    if (isContainer(e)) {
      files[`entities/${entityFileSlug(e)}.toml`] = strToU8(buildContainerToml(e));
    } else if (isXBlock(e)) {
      const base = `entities/xblock.v1/${e.xblockType}/${e.uuid}`;
      files[`${base}.toml`] = strToU8(buildXBlockToml(e));
      const versionDir = `${base}/component_versions/v${e.draftVersion}`;
      files[`${versionDir}/block.xml`] = strToU8(blockToXml(e.block, e.uuid));

      // Static assets for this xblock — keys formatted as "<uuid>/<filename>"
      if (assets) {
        const prefix = `${e.uuid}/`;
        for (const [k, file] of assets) {
          if (!k.startsWith(prefix)) continue;
          const fname = k.slice(prefix.length);
          if (!fname) continue;
          // synchronous read via reader is awkward; the caller is expected to provide File whose
          // arrayBuffer was already loaded. We rely on Blob.arrayBuffer() being available.
          // For simplicity we just write a marker and let the caller post-process — but since
          // we need synchronous bytes here, we require the caller to provide pre-resolved bytes.
          // Workaround: store the File and let buildLibraryZipAsync handle it.
          // Skip in sync path:
          void file;
          void fname;
        }
      }
    }
  }

  return zipSync(files, { level: 6 });
}

// Async variant that resolves File assets into Uint8Array before zipping.
export async function buildLibraryZipAsync({ library, assets }: LibraryExportInput): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};

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

  return zipSync(files, { level: 6 });
}

export function downloadLibraryZip(library: Library, assets?: Map<string, File>): Promise<void> {
  return buildLibraryZipAsync({ library, assets }).then((bytes) => {
    const blob = new Blob([new Uint8Array(bytes).buffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = library.learningPackage.key.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url;
    a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
