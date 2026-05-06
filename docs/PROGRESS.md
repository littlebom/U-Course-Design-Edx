# Progress Log

## Status: MVP Complete — Production-Ready for Single-User Authoring

Last updated: 2026-05-06

---

## ✅ Done

### Phase 0 — Scaffold
- Next.js 16 (Turbopack) + TypeScript + Tailwind v4 + App Router
- Node 22 via nvm

### Phase 1 — Core OLX Builder
- Zod schema (`courseSchema`, blocks union, about, grading)
- 32-hex `urlName()` generator
- XML builders: course, run, chapter, sequential, vertical, html, problem, video
- Markdown attribute auto-gen for problems (Studio-compatible)
- About files generator (title / subtitle / overview / short / effort / duration / video / description)
- Policy + grading_policy.json generators
- Asset rewrite: `asset://x` → `/static/x`
- tar.gz packing via tar-stream + zlib
- API route `POST /api/export` with FormData (course + asset_<name> files)
- Validation: Zod + missing-asset + choice integrity (no correct, multiple in MCQ)

### Phase 2 — UI
- 3-pane layout (Outline / Editor / Sidebar) with Card components
- Course Outline tree (rename/reorder/delete/add at every level)
- Block Editor (HTML / Video / Problem) with type-aware fields
- Bulk Problem Import dialog (CSV + JSON tabs, parser with `*` correct marker)
- JSON Dropzone for full-course import
- Asset Uploader (drag-drop, dedupe, copy `asset://` ref, remove)
- Validation Panel (errors + warnings, soft-pill style)
- Export Button with loading + error states
- Course Info Dialog (overview HTML, intro video preview, effort/duration)

### Phase 3 — Persistence
- localStorage auto-save (debounced 500ms)
- File System Access API integration (Open File → linked-file auto-write)
- Save / Save As / Reset buttons
- Hydration-safe (no SSR/CSR mismatch)
- Download JSON fallback for Safari/Firefox

### Phase 4 — TinyMCE Rich Editor
- Self-hosted bundle in `public/tinymce/` (~10MB, GPL, no API key)
- Toolbar matching Open edX Studio
- Asset roundtrip: blob URL display ↔ `asset://` canonical
- Image upload via TinyMCE → routes to asset panel automatically
- Source/Rich mode toggle

### Phase 5 — UX Polish (Dashcode cherry-pick)
- HSL design tokens (Dashcode color system)
- 11 shadcn-style components (`components/ui/`)
- Sarabun font (Thai + Latin) + JetBrains Mono
- Collapsible right sidebar with persisted state
- Card radius 5px (per request)
- Validation card max-h 40%
- Course meta moved from header → sidebar

### Phase 6 — Sample Content
- `public/sample.json` — minimal sample
- `public/sample-course-design.json` — 5-hour course (6 chapters, 45 blocks)
- `public/problems-learning-design.json` — 10 problems for bulk-import demo

### Phase 7 — Backup
- Git history initialized
- Pushed to https://github.com/littlebom/U-Course-Design-Edx

---

## 🔄 In Progress / Planned

### Documentation
- [x] PRD.md
- [x] ARCHITECTURE.md
- [x] IMPLEMENTATION_PLAN.md
- [x] PROGRESS.md
- [x] AGENTS.md update
- [x] README.md update

### Not Started (P2 / Future)
- [ ] **Tests** — Vitest snapshots for `block-problem.ts`, `course-xml.ts`, `tar.ts`
- [ ] **Drag-and-drop reorder** — `@dnd-kit/sortable` for outline (currently ↑↓ only)
- [ ] **String / Numerical Response problems**
- [ ] **Drag-and-drop problem type** (`<drag-and-drop-v2>`)
- [ ] **Video transcripts upload** (.srt files routed to static/)
- [ ] **Reverse import** — load existing OLX `.tar.gz` back to JSON
- [ ] **Multi-user / cloud sync**
- [ ] **Course preview** — render in iframe like Open edX LMS would
- [ ] **AI-assist** — generate problems from prompt
- [ ] **Discussion / LTI / Cohorts** in policy
- [ ] **Handouts + course updates** (`info/handouts.html`, `info/updates.html`)

---

## Known Issues
- TinyMCE `Description` aria warning in Dialog (cosmetic, no functional impact)
- Sidebar resize is fixed (no draggable splitter)
- Asset panel doesn't show image thumbnails (just filename)

---

## Verification History

### 2026-05-06 — End-to-end smoke
- `tsc --noEmit` clean
- `next build` clean
- POST `/api/export` with `sample-course-design.json` (no assets) → 200, 11148 bytes, 86 files
- Tar structure matches reference (`course.kkhtB4.tar.gz`):
  - `course.xml` ✓ pointer
  - `course/<run>.xml` ✓ with chapters + wiki
  - `chapter/sequential/vertical/html/problem/video/about/policies/static/assets` ✓
- MCQ XML matches `<choicegroup type="MultipleChoice">` ✓
- Checkbox XML matches `<choiceresponse><checkboxgroup>` ✓
- HTML pointer pattern (`<html filename="..."/>` + `.html`) ✓
- `start` attribute is JSON-encoded ✓

### Open edX import test
**Pending** — needs tutor local or devstack to verify end-to-end import.

---

## Repository
- GitHub: https://github.com/littlebom/U-Course-Design-Edx
- Branch: `main`
- License: not yet specified (consider MIT or Apache-2.0)
