# Implementation Plan — Build From Scratch

ขั้นตอนสร้างโปรเจกต์ใหม่จากศูนย์ให้ได้เหมือนทุกอย่าง

## Prerequisites
```bash
nvm install 22 && nvm use 22         # Next 16 needs ≥ 20
node -v                              # v22.x
```

---

## Phase 0 — Scaffold

```bash
npx create-next-app@latest u-coursebuilder \
  --ts --tailwind --app --eslint \
  --src-dir=false --import-alias="@/*" \
  --use-npm --turbopack --no-git --yes
cd u-coursebuilder
```

**Verify:** `npm run dev` → http://localhost:3000 default page renders.

---

## Phase 1 — Core Builder (server-side, no UI yet)

### 1.1 Install runtime deps
```bash
npm install zod xmlbuilder2 tar-stream nanoid
npm install class-variance-authority clsx tailwind-merge
```

### 1.2 Files to create (in this order)
1. **`lib/utils.ts`** — `cn()` helper (clsx + tailwind-merge)
2. **`lib/type.ts`** — Dashcode color/size/shadow types
3. **`lib/schema.ts`** — Zod schemas:
   - `choiceSchema`, `problemBlockSchema` (MCQ + checkbox)
   - `htmlBlockSchema`, `videoBlockSchema`
   - `blockSchema = discriminatedUnion("type", [html, problem, video])`
   - `verticalSchema → sequentialSchema → chapterSchema`
   - `courseAboutSchema` (defaults)
   - `graderSchema`
   - `courseSchema` (root)
   - Export types: `Course`, `Block`, `ProblemBlock`, `HtmlBlock`, `VideoBlock`, …
4. **`lib/sample.ts`** — built-in sample course
5. **`lib/validate.ts`** — `validateCourse(course, assetNames) → ValidationIssue[]`
6. **`lib/olx/ids.ts`** — `urlName()` returning 32-hex
7. **`lib/olx/asset-rewrite.ts`** — `rewriteAssets(html)` returns `{html, refs:Set<string>}`
8. **`lib/olx/block-html.ts`** — `buildHtmlBlock(block, id)` returns pointer XML + html content + refs
9. **`lib/olx/block-problem.ts`** — `buildProblemBlock(block)` + `toMarkdown(block)`
10. **`lib/olx/block-video.ts`** — `buildVideoBlock(block, id)`
11. **`lib/olx/about.ts`** — `buildAboutFiles(course) → FileEntry[]`
12. **`lib/olx/course-xml.ts`** — `buildRootCourseXml`, `buildRunCourseXml`, `buildPolicyJson`, `buildGradingPolicyJson`, `buildChapterXml`, `buildSequentialXml`, `buildVerticalXml`
13. **`lib/olx/tar.ts`** — `packTarGz(files: FileEntry[]) → Readable`
14. **`lib/olx/builder.ts`** — `buildOlxFiles(course, assets) → {files, missingAssets}`

### 1.3 Implement `app/api/export/route.ts`
```ts
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. parse formData
  // 2. courseSchema.safeParse → 400 if invalid
  // 3. collect File entries into Map<name, Buffer>
  // 4. buildOlxFiles(course, assets) → 400 if missing assets
  // 5. packTarGz(files) → stream as application/gzip
}
```

### 1.4 Verify
```bash
npx tsc --noEmit       # clean
npm run build          # clean
# POST a sample JSON to /api/export, inspect tar with `tar -tzf`
```

**Reference:** structure must match `course.kkhtB4.tar.gz` (see PRD §5).

---

## Phase 2 — UI Components

### 2.1 Install UI deps
```bash
npm install lucide-react react-dropzone tailwindcss-animate tw-animate-css next-themes
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-label \
            @radix-ui/react-tabs @radix-ui/react-separator @radix-ui/react-tooltip \
            @radix-ui/react-dropdown-menu @radix-ui/react-scroll-area \
            @radix-ui/react-radio-group @radix-ui/react-checkbox
```

### 2.2 Cherry-pick UI components
Copy from Dashcode's `Main/components/ui/` (or write from scratch matching shadcn style):
- `button.tsx` (cva variants × colors × sizes)
- `card.tsx` (set radius to 5px)
- `input.tsx`, `textarea.tsx`, `label.tsx`
- `dialog.tsx` (Radix + animations)
- `tabs.tsx`, `badge.tsx`, `separator.tsx`, `dropdown-menu.tsx`, `scroll-area.tsx`

**Note:** Dashcode's `card.tsx` depends on `useConfig` from jotai — replace with simplified version (no skin/border-toggle).

### 2.3 Replace `app/globals.css`
- `@import "tailwindcss"` + `@import "../node_modules/tw-animate-css/dist/tw-animate.css"`
- `@theme inline` block — map all `--color-*` to HSL CSS vars
- `@layer base` — define `--background`, `--foreground`, `--primary-{50..950}`, `--default-{50..950}`, `--success`, `--warning`, `--info`, `--destructive`, `--card`, `--popover`, `--ring`, `--radius`, `--sidebar`, `--header`
- `.dark` class with dark mode values
- Custom scrollbar styling

### 2.4 Build feature components (in this order)
1. **`components/JsonDropzone.tsx`** — drag JSON → Zod parse → `onLoad(course)`
2. **`components/AssetUploader.tsx`** — drag files → Map state, list with copy/delete buttons
3. **`components/ValidationPanel.tsx`** — render error/warning issues
4. **`components/ExportButton.tsx`** — POST FormData to `/api/export` → trigger download
5. **`components/CourseOutline.tsx`** — recursive tree, rename inline (double-click), reorder ↑↓, delete, add buttons. Use `structuredClone` for immutable updates.
6. **`components/BlockEditor.tsx`** — switches on block type:
   - HTML: `<HtmlField>` with Rich/Source toggle (RichEditor in Phase 4)
   - Video: `<VideoFields>` with iframe preview
   - Problem: `<ProblemFields>` with type tabs + choice cards
7. **`components/BulkProblemImport.tsx`** — Dialog with CSV/JSON tabs + textarea + parser
8. **`components/CourseInfoDialog.tsx`** — modal for `course.about` fields
9. **`app/page.tsx`** — assemble 3-pane layout, state management, all dialogs

### 2.5 Update `app/layout.tsx`
```ts
import { Sarabun, JetBrains_Mono } from "next/font/google";
const sarabun = Sarabun({ variable: "--font-sans", subsets: ["thai", "latin"], weight: [...] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });
// html className={`${sarabun.variable} ${mono.variable}`}
```

### 2.6 Verify
- TS clean, `next build` clean
- Load sample → 3 panes render → outline shows tree → click block → editor shows fields
- Drag JSON → parsing works
- Drag image → asset list updates
- Click Export → tar.gz downloads + structure valid

---

## Phase 3 — Persistence

### 3.1 Files
- **`lib/persist.ts`** — `loadFromStorage / saveToStorage / clearStorage / downloadCourseJson`
- **`lib/fileHandle.ts`** — File System Access API wrapper:
  - `supportsFileSystemAccess()`
  - `openCourseFile()` → returns `{course, handle}` (course can be null for empty file)
  - `saveAsCourseFile(course)` → returns handle
  - `writeHandle(handle, course)` — write JSON

### 3.2 Wire into `app/page.tsx`
- `useEffect` on mount → `loadFromStorage()` set course
- `useEffect` after every course change → debounced `saveToStorage` (500ms)
- `useEffect` after course change with `linkedFile` → debounced `writeHandle` (1000ms)
- Buttons: Open File / Save / Reset
- Hydration-safe: `setFsaSupported` in useEffect (not useMemo)

---

## Phase 4 — TinyMCE Rich Editor

### 4.1 Install + copy bundle
```bash
npm install tinymce @tinymce/tinymce-react
mkdir -p public/tinymce
cp -R node_modules/tinymce/{tinymce.min.js,plugins,themes,skins,icons,models} public/tinymce/
```

### 4.2 Create `components/RichEditor.tsx`
- `tinymceScriptSrc="/tinymce/tinymce.min.js"` + `licenseKey="gpl"`
- Plugins: advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount codesample
- Toolbar: undo redo | blocks | bold italic underline strikethrough | align... | bullist numlist outdent indent | link image media table codesample | removeformat | code fullscreen
- `automatic_uploads: true`, `images_upload_handler: uploadHandler`
- Maintain `blobToName: Map<string, string>` ref
- `displayHtml = useMemo(() => value.replace(/asset:\/\/(\S+)/g, name => objectURL))`
- `handleChange = (html) => onChange(html.replace(/blob:\S+/g, url => 'asset://' + blobToName.get(url)))`

### 4.3 Wire into BlockEditor
- Use `dynamic(() => import("./RichEditor"), { ssr: false })`
- Add Rich/Source tab toggle in `HtmlField`
- Pass `assets` + `onAddAsset` props through page → BlockEditor → HtmlField → RichEditor
- `addAsset` in page.tsx: dedupe filename with `-<timestamp>` suffix, add to assets Map

### 4.4 Verify
- Click Image button → upload dialog → choose file → image inserted
- Drop image into editor area → uploads
- Asset panel reflects upload + dedupe
- Source tab shows `<img src="asset://...">`
- Export → `course/static/<file>` exists, HTML rewritten to `/static/`

---

## Phase 5 — UX Polish

### 5.1 Sidebar collapse
- `sidebarOpen` state + localStorage `u-coursebuilder:sidebar`
- Toggle icon (PanelRightClose / PanelRightOpen) in header
- Grid columns adapt: `grid-cols-12` → `grid-cols-9` when collapsed
- Conditional render of `<aside>`

### 5.2 Header simplification
- Logo (GraduationCap icon in primary square)
- Course title summary: `{displayName} {org}/{code}/{run}`
- Buttons: Course Info / Save (or Save As) / Reset / Sample / Import JSON / Export / Toggle
- Linked-file chip with check icon when auto-saved

### 5.3 Card radius
- `components/ui/card.tsx` → `rounded-[5px]`

### 5.4 Validation card height
- Validation card: `max-h-[40%] shrink-0` (don't fight asset card for space)

---

## Phase 6 — Sample Content

Drop in `public/`:
- `sample.json` — minimal 1-chapter sample
- `sample-course-design.json` — full 5-hour Thai course (6 chapters, 11 sequentials, 19 verticals, 45 blocks)
- `problems-learning-design.json` — 10 bulk-import problems

---

## Phase 7 — Verification

```bash
# 1. Type + build
./node_modules/.bin/tsc --noEmit
npm run build

# 2. Functional
npm run dev
# - Load sample → tree, 3 panes correct
# - TinyMCE upload → asset panel
# - Bulk import 10 problems → vertical updated
# - Open File <empty.json> → edit → file content updates
# - Export → check tar structure

# 3. End-to-end with Open edX
# - Spin up tutor local or devstack
# - Studio → Tools → Import → upload tar.gz
# - Verify course opens, problems grade correctly, video plays, images render
```

---

## Reference Order (file copying for fastest reproduction)

If you have access to the source repo, copy in this order to minimise dep resolution churn:

```
1. package.json + package-lock.json  → npm install
2. tsconfig.json, next.config.ts, eslint.config.mjs, postcss.config.mjs
3. app/globals.css, app/layout.tsx
4. lib/  (entire dir)
5. components/ui/  (entire dir)
6. components/  (rest)
7. app/page.tsx
8. app/api/export/route.ts
9. public/tinymce/  (10MB — slow but optional, can `cp -R node_modules/tinymce/...`)
10. public/*.json
11. docs/
```

Each phase produces a working state — never leave the project broken between phases. After every phase, run `tsc --noEmit` + load app + smoke test.
