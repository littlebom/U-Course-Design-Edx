# U-CourseBuilder

Browser-based authoring suite for [Open edX](https://openedx.org) **courses** and **Content Libraries** (v1 + v2). Multi-record IndexedDB storage, round-trip import/export to Studio-ready bundles, full feature parity with Studio's Common Problem types — works offline, ships as a web app or signed Mac/Win desktop bundle.

## What it does

| Input | → | Output |
|---|---|---|
| Course `.tar.gz` (OLX) | Course editor | Course `.tar.gz` (Ulmo-compatible) |
| Library v1 `.tar.gz` | Auto-upgrade | Library v2 `.zip` (Ulmo-compatible) |
| Library v2 `.zip` | Library editor | Library v2 `.zip` (round-trip) |
| Markdown outline | Quick-import | Append to current course |
| Course JSON | Import / Backup | Course JSON / full DB backup |

Built-in support for **Open edX Ulmo** quirks: Sumac→Ulmo auto-clean (generic block name renaming, deprecated attribute stripping, library v1 → v2 upgrade), email/origin-server placeholder validation, dangling-reference auto-fix on export.

## Features

### Course editor (`/?courseId=…`)
- **Outline designer** — chapter / sequential / vertical / block tree with inline rename, reorder, delete
- **Block types (9)** — HTML (TinyMCE rich editor), Problem (5 common types — see below), Video (YouTube + MP4 + SRT), Discussion, LTI 1.3, Poll, ORA pass-through, Library Content pass-through, Unknown pass-through
- **5 problem types with Studio feature parity**
  - Multiple Choice, Checkbox, Dropdown, Numerical Input, Text Input
  - Per-choice feedback (`<choicehint>`)
  - Demand hints, weight, shuffle, partial credit (`EDC` / `halves`), show-answer modes
- **Bulk Problem Import** — paste / upload CSV or JSON to add many problems at once
- **Asset pipeline** — `asset://name` references in HTML, rewritten to `/static/` on export; auto-cleanup of orphan assets
- **Auto-save** to IndexedDB + optional file-handle link via File System Access API
- **Validation** — Zod schema + missing assets + answer integrity warnings

### Library editor (`/library/<id>`)
- **Entities** with reorder (↑↓) + delete + per-row icons
- **Collections** editor — create / rename / link/unlink entities
- **Assets** sidebar — drag-drop upload, image preview, per-entity scoping
- **Container/XBlock** picker (Section / Subsection / Unit / Problem / HTML)
- **Library v1 → v2 upgrade** — one-click conversion, UUID promotion, preserves all blocks
- **Export validation** — strips dangling refs, flags duplicate keys, ensures Ulmo email/server format

### Across the app
- **Multi-record DB** — courses + libraries in IndexedDB, soft delete + 7-day trash, backup/restore as JSON
- **Markdown structure import** — write outline in markdown, append to course
- **Sumac→Ulmo compatibility** — auto-rename generic blocks, strip deprecated attributes, library v1 reference cleanup
- **i18n-ready** — Sarabun font (Thai + Latin), language selectable per course
- **Desktop app** — Electron bundle for macOS (.dmg) + Windows (.exe)

## Quick Start

```bash
nvm use 22                    # Node ≥ 22
npm install
npm run dev -- -p 3939        # http://localhost:3939
```

Then in the UI:
1. Land on `/courses` → click **สร้างคอร์สเปล่า** or **สร้างจากตัวอย่าง**
   (or **Upgrade v1 → v2** in `/libraries` for a library)
2. Edit outline / blocks / library info
3. **Export** → `.tar.gz` (course) or `.zip` (library) downloads
4. In Open edX Studio: Tools → Import → upload the file

## Scripts

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm test             # Vitest smoke tests (11 tests)
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run check        # typecheck + lint + test (CI-friendly)
npm run package:mac  # Build signed .dmg
npm run package:win  # Build signed .exe
```

A `pre-commit` hook (via `simple-git-hooks`) runs typecheck + lint automatically.

## Stack

Next.js 16 (Turbopack) · React 19 · TypeScript · Tailwind v4 · Zod · IndexedDB (idb) · TinyMCE 7 (self-hosted) · Radix UI primitives · fflate + pako (zip/tar) · smol-toml (Library v2 TOML) · Vitest (jsdom) · Electron (desktop bundle) · Sarabun + JetBrains Mono

## Architecture (refactor done)

```
lib/
├── blocks/          # per-type modules + central registry (icon/editor/empty)
├── domain/          # CourseService + LibraryService facade over the DB
├── hooks/           # useAssetSync, useDebouncedAutosave, useSidebarPref
├── io/              # zip + tar facades over fflate/pako
├── schema/          # blocks.ts + course.ts (Zod, single source of truth)
├── library/         # Library v1/v2 import + export
├── olx/             # Course OLX import + export
└── db/              # IndexedDB CRUD (courses, libraries, assets, backup, gc)

components/
├── blocks/          # per-block editors (HtmlField, ProblemFields/*, VideoFields, …)
├── library/         # library-specific editor components
└── ui/              # Radix-based design system

app/
├── /                # Course editor (?courseId=…)
├── /courses         # Course library
├── /libraries       # Content Library list
├── /library/[id]    # Content Library editor
└── /markdown        # Markdown outline import
```

See [`AGENTS.md`](AGENTS.md) for the AI-collaboration guide.

## Documentation
- [`docs/PRD.md`](docs/PRD.md) — Product requirements & JSON schema
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — File layout & data flow
- [`docs/MULTI-COURSE.md`](docs/MULTI-COURSE.md) — IndexedDB + multi-course design
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — Status of features
- [`AGENTS.md`](AGENTS.md) — Guide for AI coding agents

## Sample files (in `public/`)
- `sample.json` — minimal sample course
- `sample-course-design.json` — 5-hour Thai course "การออกแบบหลักสูตรออนไลน์"
- `problems-learning-design.json` — 10 problems for bulk-import demo
- `template.xml` + `problems-learning-design.xml` — XML templates

## License
TinyMCE bundled under GPL. Project license TBD.
