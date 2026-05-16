import { z } from "zod";
import { blockSchema, type Block } from "../schema";

// ─── Open edX Library v2 model ────────────────────────────────────────────
// Mirrors the export format Studio (Ulmo+) produces:
//   <lib>.zip
//   ├── package.toml
//   ├── collections/<key>.toml
//   └── entities/
//       ├── <slug>.toml                            (container entity)
//       └── xblock.v1/<type>/<uuid>.toml + .../component_versions/v<N>/block.xml

export const containerKindSchema = z.enum(["section", "subsection", "unit"]);
export type ContainerKind = z.infer<typeof containerKindSchema>;

// Container entity — sections/subsections/units that hold children
export const libraryContainerSchema = z.object({
  kind: z.literal("container"),
  key: z.string(),                              // slug used in file name & references
  title: z.string(),
  containerKind: containerKindSchema,
  draftVersion: z.number().int().min(1).default(1),
  publishedVersion: z.number().int().min(1).default(1),
  canStandAlone: z.boolean().default(true),
  created: z.string().optional(),               // ISO timestamp
  children: z.array(z.string()).default([]),    // child entity keys
});
export type LibraryContainer = z.infer<typeof libraryContainerSchema>;

// XBlock entity — actual content (problem/html/video/…)
export const libraryXBlockSchema = z.object({
  kind: z.literal("xblock"),
  key: z.string(),                              // "xblock.v1:problem:<uuid>"
  title: z.string(),
  xblockType: z.string(),                       // "problem" | "html" | "video" | …
  uuid: z.string(),                             // UUID v4 (with dashes)
  draftVersion: z.number().int().min(1).default(1),
  publishedVersion: z.number().int().min(1).default(1),
  canStandAlone: z.boolean().default(true),
  created: z.string().optional(),
  block: blockSchema,                           // parsed inner OLX (reuses existing Block schema)
});
export type LibraryXBlock = z.infer<typeof libraryXBlockSchema>;

export const libraryEntitySchema = z.discriminatedUnion("kind", [
  libraryContainerSchema,
  libraryXBlockSchema,
]);
export type LibraryEntity = z.infer<typeof libraryEntitySchema>;

export const libraryCollectionSchema = z.object({
  key: z.string(),                              // "lesson-1"
  title: z.string(),
  description: z.string().default(""),
  created: z.string().optional(),
  entities: z.array(z.string()).default([]),    // entity keys
});
export type LibraryCollection = z.infer<typeof libraryCollectionSchema>;

export const librarySchema = z.object({
  meta: z.object({
    formatVersion: z.number().int().default(1),
    createdBy: z.string().default(""),
    createdByEmail: z.string().default(""),
    createdAt: z.string().optional(),
    originServer: z.string().default(""),
  }),
  learningPackage: z.object({
    title: z.string().min(1),
    key: z.string().min(1),                     // "lib:Org:Code"
    description: z.string().default(""),
    created: z.string().optional(),
    updated: z.string().optional(),
  }),
  entities: z.array(libraryEntitySchema).default([]),
  collections: z.array(libraryCollectionSchema).default([]),
});
export type Library = z.infer<typeof librarySchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────

export function isContainer(e: LibraryEntity): e is LibraryContainer {
  return e.kind === "container";
}
export function isXBlock(e: LibraryEntity): e is LibraryXBlock {
  return e.kind === "xblock";
}

// Build a quick lookup map from entity key → entity
export function entityIndex(lib: Library): Map<string, LibraryEntity> {
  return new Map(lib.entities.map((e) => [e.key, e]));
}

// Re-export Block for convenience
export type { Block };
