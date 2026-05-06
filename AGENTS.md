<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Guide for AI Coding Agents

This file orients AI agents (Claude Code, Codex, Cursor, etc.) working on this repo.

## What this project is
A Next.js 16 web app that converts a JSON course definition into an Open edX OLX `.tar.gz` bundle. See `docs/PRD.md` for product spec and `docs/ARCHITECTURE.md` for technical layout.

## Read these first
1. **`docs/PRD.md`** — product scope, JSON schema, OLX output spec
2. **`docs/ARCHITECTURE.md`** — file layout, data flow, critical implementation details
3. **`docs/PROGRESS.md`** — what's done, what's planned

## Stack reminders
- **Next.js 16** with **Turbopack** — APIs may differ from training data; check `node_modules/next/dist/docs/` if unsure
- **React 19** — server / client component split; `"use client"` for interactive components
- **Tailwind v4** — uses `@theme inline`, `@custom-variant`, `@layer base` (different from v3)
- **Node 22** required (use `nvm use 22` before any `npm` / `npx` command)

## House rules

### When editing
- Run `./node_modules/.bin/tsc --noEmit` after non-trivial changes (don't use `npx tsc` — it pulls a wrong package)
- For UI changes, check the dev server still serves 200
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Match existing patterns: HSL tokens (`bg-default-100`, `text-primary`), not raw colors

### What NOT to do
- Don't introduce new state-management libraries (no Redux/Zustand/Jotai) — current `useState` + `structuredClone` is intentional
- Don't add server-side persistence (no DB, no auth) — keep it stateless
- Don't access `window` / `localStorage` at render time — use `useEffect`. Hydration errors are real here.
- Don't replace TinyMCE without strong reason — Open edX Studio uses it; output HTML compatibility matters
- Don't change `url_name` generation away from 32-hex — Studio expects this format

### When adding a block type
1. Add Zod schema in `lib/schema.ts` and update `blockSchema` discriminated union
2. Add type to `blockRefs` union in `lib/olx/builder.ts`
3. Create `lib/olx/block-<type>.ts` with builder
4. Update `buildVerticalXml` in `lib/olx/course-xml.ts` to allow new ref type
5. Update validation in `lib/validate.ts`
6. Add icon + add-button + render in `components/CourseOutline.tsx`
7. Add type-specific fields component in `components/BlockEditor.tsx`
8. Test export → check XML output structure

### Critical OLX format rules (don't break)
- `course.xml` is a pointer; actual course data lives in `course/<run>.xml` AND `policies/<run>/policy.json` (mirrored — keep them in sync)
- HTML must be a pointer (`<html filename="<id>"/>`) + a separate `.html` file. Don't inline.
- `<problem>` MUST have `markdown` attribute (auto-gen from choices)
- `start` attribute in run xml must be JSON-encoded string (`JSON.stringify(date)` not raw date)
- 32-hex `url_name` everywhere (no dashes)

### TinyMCE asset roundtrip
The canonical HTML stored in state always uses `asset://name` URLs. The TinyMCE editor displays blob URLs internally. Don't mix these — `RichEditor.tsx` does the bidirectional rewriting.

### Hydration safety
- Anything checking `window`, `localStorage`, browser APIs → put in `useEffect`, not `useMemo` at render
- `RichEditor` is `dynamic(..., { ssr: false })`
- Conditional UI based on browser capability needs `hydrated` flag pattern

## Commands

```bash
# Dev (use port 3939 if 3000 is taken by another local server)
nvm use 22
npm run dev -- -p 3939

# Type check
./node_modules/.bin/tsc --noEmit

# Build
npm run build

# Test export endpoint
curl -X POST http://localhost:3939/api/export -F "course=<sample.json" -o out.tar.gz
tar -tzf out.tar.gz
```

## Common pitfalls
- **`start` attribute renders as `"&quot;...&quot;"`** — that's correct, edX expects JSON-encoded strings in XML attributes
- **TinyMCE images show as broken** — check that the parent state has the canonical `asset://` URL and that `assets` Map contains the file
- **Build fails with "Can't resolve 'tw-animate-css'"** — globals.css must use the relative path `../node_modules/tw-animate-css/dist/tw-animate.css`
- **Port 3000 returns 404 for `/api/export`** — another local server (Express) probably grabbed the port. Use `-p 3939` or kill the other process.
- **`@/components/ui/tooltip` errors** — that file was removed (Radix Tooltip TS def issue with React 19). Don't re-add unless you fix the type problem.

## How to verify your changes
1. **TS clean:** `./node_modules/.bin/tsc --noEmit`
2. **Build clean:** `npm run build`
3. **Functional smoke:**
   - Load `/sample-course-design.json` via Import JSON button
   - Open various block types in the editor
   - Upload an image into a TinyMCE block, see it in asset panel
   - Click Export, check tar structure: `tar -tzf <file> | sort`
4. **End-to-end** (when changing OLX format): import the produced tar.gz into Open edX Studio (tutor local or devstack)
