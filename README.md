# OLX Course Builder

JSON → OLX (`.tar.gz`) builder for [Open edX](https://openedx.org). Author courses in a fast web UI, export a Studio-importable bundle.

## Features
- **Course Outline Designer** — tree view, rename inline, reorder, delete, add at every level
- **Block types** — HTML (TinyMCE rich editor), Problem (MCQ + Checkbox), Video (YouTube)
- **Bulk Problem Import** — paste / upload CSV or JSON to add many problems at once
- **TinyMCE rich editor** — same family as Open edX Studio; uploaded images auto-routed to asset panel
- **Course Info** — overview HTML, intro video, short description, effort, duration
- **Asset pipeline** — `asset://name` references in HTML, rewritten to `/static/` at export
- **Persistence** — auto-save to localStorage + linked-file save via File System Access API
- **Validation** — Zod schema + missing assets + answer integrity warnings
- **i18n-ready** — Sarabun font (Thai + Latin), language selectable per course

## Quick Start
```bash
nvm use 22                    # Node ≥ 20 required
npm install
npm run dev -- -p 3939        # http://localhost:3939
```

Then in the UI:
1. Click **Sample** to load the demo
2. Edit outline / blocks / course info
3. Click **Export** → `.tar.gz` downloads
4. In Open edX Studio: Tools → Import → upload the file

## Stack
Next.js 16 (Turbopack) · React 19 · TypeScript · Tailwind v4 · Zod · TinyMCE 7 (self-hosted) · Radix UI primitives · Sarabun + JetBrains Mono

## Documentation
- [`docs/PRD.md`](docs/PRD.md) — Product requirements & JSON schema
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — File layout & data flow
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — Step-by-step rebuild guide
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — Status of features
- [`AGENTS.md`](AGENTS.md) — Guide for AI coding agents

## Sample files (in `public/`)
- `sample.json` — minimal sample
- `sample-course-design.json` — 5-hour Thai course "การออกแบบหลักสูตรออนไลน์"
- `problems-learning-design.json` — 10 problems for bulk-import demo

## License
TinyMCE bundled under GPL. Project license TBD.
