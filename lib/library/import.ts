"use client";

import { strFromU8 } from "fflate";
import { unzip } from "../io/zip";
import { parse as parseToml } from "smol-toml";
import { parseBlockFile } from "../olx/import/parse-block";
import {
  librarySchema,
  type Library,
  type LibraryContainer,
  type LibraryEntity,
  type LibraryXBlock,
  type ContainerKind,
} from "./schema";

// smol-toml decodes TOML datetimes into JS Date — keep ISO 8601 throughout our model.
function toIso(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export interface LibraryImportResult {
  library: Library;
  warnings: string[];
  assets: Map<string, File>;
}

// Parse a Library v2 .zip exported by Open edX (Ulmo+).
export async function parseLibraryZip(buffer: ArrayBuffer): Promise<LibraryImportResult> {
  const warnings: string[] = [];
  const assetsOut = new Map<string, File>();
  const files = unzip(buffer);

  // ── package.toml ─────────────────────────────────────────────────────────
  const pkgBuf = files["package.toml"];
  if (!pkgBuf) throw new Error("ไม่พบ package.toml — ไฟล์อาจไม่ใช่ Library v2");
  const pkg = parseToml(strFromU8(pkgBuf)) as {
    meta?: Record<string, unknown>;
    learning_package?: Record<string, unknown>;
  };
  const meta = pkg.meta ?? {};
  const lp = pkg.learning_package ?? {};

  // ── Collections ──────────────────────────────────────────────────────────
  const collections: Library["collections"] = [];
  for (const path of Object.keys(files)) {
    const m = path.match(/^collections\/([^/]+)\.toml$/);
    if (!m) continue;
    try {
      const data = parseToml(strFromU8(files[path])) as { collection?: Record<string, unknown> };
      const c = data.collection ?? {};
      collections.push({
        key: String(c.key ?? m[1]),
        title: String(c.title ?? m[1]),
        description: String(c.description ?? ""),
        created: toIso(c.created),
        entities: Array.isArray(c.entities) ? (c.entities as string[]) : [],
      });
    } catch (e) {
      warnings.push(`ข้าม collection ${m[1]}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Container entities (entities/<slug>.toml, not inside xblock.v1/) ─────
  const entities: LibraryEntity[] = [];
  for (const path of Object.keys(files)) {
    const m = path.match(/^entities\/([^/]+)\.toml$/);
    if (!m) continue;
    try {
      const data = parseToml(strFromU8(files[path])) as Record<string, unknown>;
      const ent = (data.entity ?? {}) as Record<string, unknown>;
      const container = ent.container as Record<string, unknown> | undefined;
      if (!container) continue; // not a container entity
      const containerKind = Object.keys(container)[0] as ContainerKind;
      if (!containerKind || !["section", "subsection", "unit"].includes(containerKind)) {
        warnings.push(`ข้าม container ${m[1]}: ไม่รู้ kind`);
        continue;
      }
      const versions = Array.isArray(data.version) ? (data.version as Record<string, unknown>[]) : [];
      const draftVersionNum = Number((ent.draft as Record<string, unknown>)?.version_num ?? 1);
      const publishedVersionNum = Number((ent.published as Record<string, unknown>)?.version_num ?? 1);
      const liveVersion = versions.find((v) => Number(v.version_num) === draftVersionNum) ?? versions[versions.length - 1];
      const versionContainer = (liveVersion?.container as Record<string, unknown>) ?? {};

      const c: LibraryContainer = {
        kind: "container",
        key: String(ent.key ?? m[1]),
        title: String(liveVersion?.title ?? m[1]),
        containerKind,
        draftVersion: draftVersionNum,
        publishedVersion: publishedVersionNum,
        canStandAlone: ent.can_stand_alone !== false,
        created: toIso(ent.created),
        children: Array.isArray(versionContainer.children) ? (versionContainer.children as string[]) : [],
      };
      entities.push(c);
    } catch (e) {
      warnings.push(`ข้าม container ${m[1]}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── XBlock entities (entities/xblock.v1/<type>/<uuid>.toml) ──────────────
  for (const path of Object.keys(files)) {
    const m = path.match(/^entities\/xblock\.v1\/([^/]+)\/([^/]+)\.toml$/);
    if (!m) continue;
    const xType = m[1];
    const uuid = m[2];
    try {
      const data = parseToml(strFromU8(files[path])) as Record<string, unknown>;
      const ent = (data.entity ?? {}) as Record<string, unknown>;
      const versions = Array.isArray(data.version) ? (data.version as Record<string, unknown>[]) : [];
      const draftVersionNum = Number((ent.draft as Record<string, unknown>)?.version_num ?? 1);
      const publishedVersionNum = Number((ent.published as Record<string, unknown>)?.version_num ?? 1);
      const liveVersion = versions.find((v) => Number(v.version_num) === draftVersionNum) ?? versions[versions.length - 1];

      // Load block.xml from component_versions/v<N>/block.xml
      const versionDir = `entities/xblock.v1/${xType}/${uuid}/component_versions/v${draftVersionNum}/`;
      const blockXmlBuf = files[versionDir + "block.xml"];
      if (!blockXmlBuf) {
        warnings.push(`ข้าม xblock ${xType}/${uuid}: ไม่พบ block.xml`);
        continue;
      }
      const blockXml = strFromU8(blockXmlBuf);

      // Reuse course OLX block parser — wrap into a fake file map and let parseBlockFile do it.
      const blockEl = new DOMParser().parseFromString(blockXml, "application/xml").documentElement;
      const fakeFiles = new Map<string, { text: string; binary: Uint8Array }>();
      const parsed = parseBlockFile(xType, uuid, fakeFiles, warnings, blockEl);
      if (!parsed) {
        warnings.push(`ข้าม xblock ${xType}/${uuid}: parse ไม่สำเร็จ`);
        continue;
      }

      // Pull static assets from component_versions/v<N>/static/*
      const staticPrefix = versionDir + "static/";
      for (const fp of Object.keys(files)) {
        if (!fp.startsWith(staticPrefix)) continue;
        const fileName = fp.slice(staticPrefix.length);
        if (!fileName) continue;
        const buf = files[fp];
        const blob = new Blob([new Uint8Array(buf).buffer], {});
        // Asset key prefixed with uuid to avoid collisions across blocks
        assetsOut.set(`${uuid}/${fileName}`, new File([blob], fileName));
      }

      const x: LibraryXBlock = {
        kind: "xblock",
        key: `xblock.v1:${xType}:${uuid}`,
        title: String(liveVersion?.title ?? (parsed as { displayName?: string }).displayName ?? xType),
        xblockType: xType,
        uuid,
        draftVersion: draftVersionNum,
        publishedVersion: publishedVersionNum,
        canStandAlone: ent.can_stand_alone !== false,
        created: toIso(ent.created),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        block: parsed as any,
      };
      entities.push(x);
    } catch (e) {
      warnings.push(`ข้าม xblock ${xType}/${uuid}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const raw = {
    meta: {
      formatVersion: Number(meta.format_version ?? 1),
      createdBy: String(meta.created_by ?? ""),
      createdByEmail: String(meta.created_by_email ?? ""),
      createdAt: meta.created_at ? toIso(meta.created_at) : undefined,
      originServer: String(meta.origin_server ?? ""),
    },
    learningPackage: {
      title: String(lp.title ?? "Untitled Library"),
      key: String(lp.key ?? "lib:UNKNOWN:000"),
      description: String(lp.description ?? ""),
      created: lp.created ? toIso(lp.created) : undefined,
      updated: lp.updated ? toIso(lp.updated) : undefined,
    },
    entities,
    collections,
  };

  const result = librarySchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Library schema ไม่ถูกต้อง: ${result.error.issues[0]?.message ?? "unknown"}`);
  }

  return { library: result.data, warnings, assets: assetsOut };
}
