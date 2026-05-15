# Multi-Course Architecture

## Overview

ระบบจัดการหลายรายวิชา (multi-course) สร้างขึ้นบน **IndexedDB** ผ่าน `idb` library. โครงสร้างประกอบด้วย 3 object stores:

| Store | Key | Purpose |
|---|---|---|
| `courses` | `id` (UUID) | Course metadata + full Course JSON |
| `assets` | `[courseId, fileName]` | รูปภาพ, SRT transcripts ต่อคอร์ส |
| `meta` | string key | `currentCourseId`, `schemaVersion`, migration flags |

## Code Layout

```
lib/db/
├── index.ts          // getDb(), getMeta(), setMeta(), getStorageEstimate()
├── types.ts          // CourseRecord, AssetRecord, MetaRecord
├── courses.ts        // CRUD: list/get/create/save/duplicate/softDelete/hardDelete/purgeOldTrash
├── assets.ts         // CRUD: list/get/put/putBatch/delete/loadAssetsAsMap
├── seed.ts           // emptyCourseSeed(), sampleCourseSeed()
├── migrate.ts        // migrateLegacyLocalStorage() — one-shot import from pre-DB release
├── backup.ts         // exportAllAsJson(), importBackup() — full DB backup/restore
└── sync.ts           // (Phase 6 placeholder) CloudSyncProvider interface
```

## User Flow

1. **First visit** — user lands on `/` → no `?courseId=` param → redirect to `/courses`
2. **Legacy migration** — `/courses` runs `migrateLegacyLocalStorage()` once; if the
   user had a single course saved in localStorage from before, it's imported as
   their first course and they jump straight into the editor.
3. **Create / Open** — `/courses` shows cards; click → `/?courseId=<id>` mounts editor.
4. **Auto-save** — every edit triggers a 600 ms debounced `saveCourse()`. The header
   shows "กำลังบันทึก…" → "บันทึกแล้ว Nวินาทีก่อน".
5. **Asset CRUD** — `handleAssetsChange` diffs old vs new Map and writes/deletes
   in IndexedDB without affecting other courses.
6. **Course switcher** — header dropdown shows last 5 courses; "ดูทั้งหมด…" jumps to `/courses`.

## Soft Delete

`softDeleteCourse(id)` marks `deletedAt: Date.now()`. The trash bin tab shows them.
`purgeOldTrash(7)` runs on `/courses` mount and hard-deletes courses older than 7 days.

## Backup / Restore

`exportAllAsJson()` produces a single JSON file containing every course and asset
(assets are base64-encoded). `importBackup(file)` always creates **new** course IDs
to avoid clobbering existing data — duplicate imports = duplicate copies.

## Phase 6 — Cloud Sync (not implemented)

`lib/db/sync.ts` defines the `CloudSyncProvider` interface. To enable cloud sync:

1. Choose a backend (Supabase / Firebase / custom).
2. Create `lib/db/sync-providers/<name>.ts` implementing the interface.
3. Call `setSyncProvider(provider)` at app boot.
4. Add sync UI: badge on each card, manual sync button, conflict prompt.

Conflict policy is **last-write-wins on `updatedAt`** — for stronger semantics we'd
add a per-course revision counter to `CourseRecord` and prompt on conflict.

## Storage Limits

`getStorageEstimate()` wraps `navigator.storage.estimate()`. The `StorageBar`
component on `/courses` shows usage / quota. Most browsers grant ~50% of free disk;
warning turns red at >80% usage.

## Known Limitations

- **No MP4 storage** — video blocks reference an `mp4Url` (external) rather than
  uploading binaries. Storing large MP4 files in IndexedDB is technically allowed
  but quickly exceeds quota.
- **Single-tab edit only** — opening the same course in two tabs may cause one to
  overwrite the other's changes. A BroadcastChannel lock is on the wishlist.
- **No conflict UI** — last-write-wins on autosave; if you reload mid-edit you
  might lose ~600 ms of unsaved keystrokes.
