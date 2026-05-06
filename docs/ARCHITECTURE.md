# Architecture

## Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | API route + RSC + dev DX |
| Runtime | Node.js ≥ 22 (via nvm `v22.22.2`) | Next 16 minimum |
| Language | TypeScript (strict) | Type safety, schema sharing |
| Styling | Tailwind CSS v4 | Design tokens via `@theme inline` |
| Components | shadcn/ui (cherry-picked from Dashcode) | Radix primitives + Dashcode tokens |
| Validation | Zod | Source of truth, runtime + types |
| XML | xmlbuilder2 | Generate clean OLX XML |
| Tar | tar-stream | Stream `.tar.gz` from Node API route |
| Fonts | Sarabun + JetBrains Mono (next/font) | Thai-friendly, monospace for source |
| Rich editor | TinyMCE 7 (self-hosted, GPL) | Same as Open edX Studio |
| Icons | lucide-react | Used by shadcn defaults |
| Drag-drop | react-dropzone | JSON / asset upload |

## Directory Layout
```
course-olx-builder/
  app/
    layout.tsx                    # Sarabun font + html lang="th"
    page.tsx                      # Main 3-pane UI (client component)
    globals.css                   # Tailwind v4 + Dashcode HSL tokens + animations
    api/
      export/route.ts             # POST → stream tar.gz (runtime: nodejs)
  components/
    CourseOutline.tsx             # tree designer (rename/reorder/delete/add)
    BlockEditor.tsx               # editor panel (HTML / Video / Problem)
    RichEditor.tsx                # TinyMCE wrapper (dynamic, ssr:false)
    BulkProblemImport.tsx         # modal for CSV/JSON bulk add
    JsonDropzone.tsx              # drag JSON → load full course
    AssetUploader.tsx             # drag files → Map<filename, AssetFile>
    ValidationPanel.tsx           # render Zod issues + warnings
    ExportButton.tsx              # POST /api/export + trigger download
    CourseInfoDialog.tsx          # course.about editor (overview, intro video, etc.)
    ui/                           # cherry-picked Dashcode components
      button.tsx                  # cva variants × colors × sizes
      card.tsx                    # rounded-[5px], shadow-base
      input.tsx, textarea.tsx, label.tsx
      dialog.tsx                  # Radix dialog with animations
      tabs.tsx                    # Radix tabs
      badge.tsx, separator.tsx, dropdown-menu.tsx, scroll-area.tsx
  lib/
    schema.ts                     # Zod: courseSchema + types (Course, Block, Problem, Video, ...)
    sample.ts                     # built-in sample course
    validate.ts                   # validateCourse() — issues including missing assets
    persist.ts                    # localStorage save/load + downloadCourseJson
    fileHandle.ts                 # File System Access API wrapper (Open File / Save / Save As)
    utils.ts                      # cn() — clsx + tailwind-merge
    type.ts                       # Dashcode color/size/shadow types
    olx/
      ids.ts                      # urlName() — 32-char hex
      asset-rewrite.ts            # asset://x → /static/x + collect refs
      block-html.ts               # html/<id>.xml + .html + asset rewriting
      block-problem.ts            # MCQ / checkbox + auto-gen markdown
      block-video.ts              # video/<id>.xml with YouTube + transcripts
      course-xml.ts               # course.xml, course/<run>.xml, policies, chapter/seq/vertical
      about.ts                    # course/about/*.html
      builder.ts                  # orchestrator: Course → FileEntry[]
      tar.ts                      # FileEntry[] → tar.gz Readable stream
  public/
    tinymce/                      # self-hosted bundle (~10MB) — copied from node_modules
    sample.json                   # default sample
    sample-course-design.json     # 5-hour course "การออกแบบหลักสูตรออนไลน์"
    problems-learning-design.json # 10 bulk-import problems
  docs/
    PRD.md, ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, PROGRESS.md
```

## Data Flow

### State (in `app/page.tsx`)
```ts
const [course, setCourse] = useState<Course>(sampleCourse);   // canonical source
const [assets, setAssets] = useState<Map<string, AssetFile>>(new Map());
const [sel, setSel] = useState<Sel | null>(...);              // currently-edited block
const [bulkTarget, setBulkTarget] = useState<{ci,si,vi} | null>(null);
const [linkedFile, setLinkedFile] = useState<{handle, name} | null>(null);
const [sidebarOpen, setSidebarOpen] = useState(true);
```

### Edit cycle
```
User action (rename / type in editor / drag image)
  → child component callback: onChange(nextCourse) / setAssets(...)
  → setCourse / setAssets in page.tsx
  → useEffect debounced 500ms → saveToStorage(course)
  → useEffect debounced 1000ms → writeHandle(linkedFile, course)  if linked
  → useMemo recompute issues = validateCourse(course, assetNames)
  → ValidationPanel re-renders
```

### TinyMCE asset wiring (RichEditor.tsx)
```
Editor display:  asset://name  →  blob: URL  (using objectURL of assets.get(name).blob)
                                                      ↓
                                                  TinyMCE renders <img src=blob:...>
On editor change: HTML extracted →  blob: URL  →  asset://name  (using blobToName Map)
                                                      ↓
                                                onChange(canonicalHtml) → state
On image upload:  blobInfo.blob() → onAddAsset(file) → adds to assets Map
                                                      ↓
                              returns blob: URL (TinyMCE inserts), tracks mapping
```
**Key invariant:** `course.chapters[*].sequentials[*].verticals[*].blocks[*]` ของชนิด HTML จะมี `html` เป็น canonical (`asset://x`) เสมอ — blob URLs เกิดเฉพาะใน TinyMCE display layer

### Export pipeline (API route → tar.gz)
```
Client:
  FormData
    "course" = JSON.stringify(course)
    "asset_<name>" = File for each asset
  → fetch POST /api/export

Server (app/api/export/route.ts, runtime: nodejs):
  1. parse formData
  2. courseSchema.safeParse(JSON.parse(course))  → 400 if invalid
  3. extract Files into Map<name, Buffer>
  4. buildOlxFiles(course, assets) → { files: FileEntry[], missingAssets[] }
       → 400 if missing
  5. packTarGz(files) → Readable (tar-stream → gzip)
  6. stream as application/gzip with Content-Disposition

Builder.buildOlxFiles iterates:
  for each chapter:
    for each sequential:
      for each vertical:
        for each block:
          urlName() → id32
          if html  → push html/<id>.xml + html/<id>.html (asset-rewrite.ts collects refs)
          if video → push video/<id>.xml
          if problem → push problem/<id>.xml
        push vertical/<vid>.xml
      push sequential/<sid>.xml
    push chapter/<cid>.xml
  push course.xml + course/<run>.xml + policies/<run>/{policy,grading_policy}.json
  push assets/assets.xml + about/*
  for each ref in collected refs:
    if assets.has(ref) → push static/<ref>
    else → missingAssets.push(ref)
```

## URL Names & ID strategy
- `urlName()` = `crypto.randomUUID().replace(/-/g, '')` → 32 hex chars
- ทุกครั้งที่ build จะ generate ใหม่ (ไม่ persist) — Studio assigns ของตัวเองตอน import อยู่แล้ว
- block ใน vertical/seq/chapter อ้างกันด้วย url_name ที่สร้างใน loop เดียว (consistent ภายใน export)

## Persistence Layers
1. **localStorage** (`lib/persist.ts`)
   - Key: `olx-builder:course:v1`
   - Trigger: useEffect debounced 500ms after every `course` change
   - Validation: Zod parse on load — invalid data → ignore (start fresh)
2. **File System Access API** (`lib/fileHandle.ts`)
   - `openCourseFile()` → `showOpenFilePicker` → return `{course, handle}`
   - `saveAsCourseFile(course)` → `showSaveFilePicker` → write
   - `writeHandle(handle, course)` → `createWritable` → write JSON
   - Linked file gets auto-write on every change (debounced 1s)
   - Browser support: Chrome/Edge/Brave/Opera; fallback = `downloadCourseJson()`
3. **Sidebar state** (`localStorage olx-builder:sidebar`)

## Critical Implementation Details

### `start` attribute encoding
Open edX expects `start` as JSON-encoded string in XML attribute:
```xml
<course start="&quot;2026-06-01T00:00:00Z&quot;">
```
Implemented in `course-xml.ts:buildRunCourseXml()` via `JSON.stringify(c.course.start)`.

### Problem markdown auto-gen
Studio uses `markdown` attribute for the rich-edit view. We synthesize it:
```
( ) wrong choice         # MCQ
(x) correct choice
[ ] wrong (checkbox)
[x] correct (checkbox)
[explanation]            # if explanation present
text...
[explanation]
```
See `block-problem.ts:toMarkdown()`.

### HTML pointer pattern
Open edX requires HTML in 2 files (not inline):
- `html/<id>.xml` = `<html filename="<id>" display_name="..."/>`
- `html/<id>.html` = the actual HTML content

This is what Studio uses internally — keep this pattern even though `<html>` could embed content directly.

### Hydration safety
- `RichEditor` is `dynamic(..., { ssr: false })` — TinyMCE accesses `window`
- `supportsFileSystemAccess()` check is in `useEffect` (not `useMemo` at render) — prevents server/client HTML mismatch
- `linkedFile` and `savedAt` UI gated on `hydrated` flag

## Theme & Tokens
HSL CSS variables in `globals.css` (cherry-picked from Dashcode):
- Brand: `--primary` (blue 221.2°), `--success`, `--warning`, `--info`, `--destructive`
- Neutral scale: `--default-50` … `--default-950`
- Card: `bg-card` light, dark mode supported via `.dark` class
- Card radius forced to 5px in `components/ui/card.tsx`
- Default font family is `var(--font-sans)` injected by `next/font/google` Sarabun

## Why these choices

| Decision | Reason |
|---|---|
| Single-page React app, no DB | Course content is short-lived, user owns the JSON |
| Zod schema as single source of truth | Runtime validation + TS types from one definition |
| TinyMCE GPL (self-hosted), not cloud | No API key friction, offline-capable, ~10MB acceptable for backup |
| `asset://` scheme + rewrite at export | Decouple authoring from filesystem; Markdown / HTML stays portable |
| Server-side tar packing (Node runtime) | `tar-stream` is Node-only; streaming for large courses |
| Cherry-pick Dashcode (not full migration) | Keep Next 16; gain premium UI without rewriting layout |
| 32-hex `url_name` | Match Open edX export format exactly |
