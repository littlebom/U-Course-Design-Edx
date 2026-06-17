"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Info,
  Save,
  CheckCircle2,
  FileCode2,
  PackageOpen,
  Link2,
  PanelRightOpen,
  PanelRightClose,
  Sparkles,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import type { Course, ProblemBlock } from "@/lib/schema";
import { sampleCourse } from "@/lib/sample";
import { validateCourse } from "@/lib/validate";
import { cleanCourse, type CleanAction } from "@/lib/clean";
import { checkUlmoReadiness } from "@/lib/readiness";
import { CourseOutline } from "@/components/CourseOutline";
import { BlockEditor } from "@/components/BlockEditor";
import { JsonDropzone, type JsonDropzoneHandle } from "@/components/JsonDropzone";
import { OlxDropzone, type OlxDropzoneHandle } from "@/components/OlxDropzone";
import { AssetUploader, type AssetFile } from "@/components/AssetUploader";
import { ValidationPanel } from "@/components/ValidationPanel";
import { ReadinessPanel } from "@/components/ReadinessPanel";
import { CleanupDialog } from "@/components/CleanupDialog";
import { ExportButton } from "@/components/ExportButton";
import { BulkProblemImport } from "@/components/BulkProblemImport";
import { CourseInfoDialog } from "@/components/CourseInfoDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { SequentialEditor } from "@/components/SequentialEditor";
import { CourseSwitcher } from "@/components/CourseSwitcher";
import { SaveIndicator } from "@/components/SaveIndicator";
import { useAssetSync } from "@/lib/hooks/useAssetSync";
import { useDebouncedAutosave } from "@/lib/hooks/useDebouncedAutosave";
import { useSidebarPref } from "@/lib/hooks/useSidebarPref";
import { Navbar } from "@/components/Navbar";
import { downloadCourseJson } from "@/lib/persist";
import { courseService } from "@/lib/domain";
import { setMeta } from "@/lib/db";
import {
  saveAsCourseFile,
  supportsFileSystemAccess,
  writeHandle,
  type FileSystemFileHandle,
} from "@/lib/fileHandle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Sel = { ci: number; si: number; vi: number; bi: number } | null;
type SeqSel = { ci: number; si: number } | null;

export default function Page() {
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center text-default-400">กำลังโหลด…</div>}>
      <PageInner />
    </Suspense>
  );
}

function PageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [course, setCourse] = useState<Course>(sampleCourse);
  const [sel, setSel] = useState<Sel>({ ci: 0, si: 0, vi: 0, bi: 0 });
  const [seqSel, setSeqSel] = useState<SeqSel>(null);
  const [bulkTarget, setBulkTarget] = useState<{ ci: number; si: number; vi: number } | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<{ course: Course; actions: CleanAction[] } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [linkedFile, setLinkedFile] = useState<{ handle: FileSystemFileHandle; name: string } | null>(null);
  const [linkedSavedAt, setLinkedSavedAt] = useState<number | null>(null);
  const [fsaSupported, setFsaSupported] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useSidebarPref();
  const xmlRef = useRef<JsonDropzoneHandle>(null);
  const olxRef = useRef<OlxDropzoneHandle>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setFsaSupported(supportsFileSystemAccess()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Asset CRUD (race-safe via shared hook) ────────────────────────────
  const assetSync = useAssetSync<AssetFile>({
    compare: (a, b) => a.blob === b.blob,
    onPut: async (name, af) => {
      if (!courseId) return;
      const file = af.blob instanceof File ? af.blob : new File([af.blob], name);
      await courseService.putAsset(courseId, file, name);
    },
    onDelete: async (name) => { if (courseId) await courseService.deleteAsset(courseId, name); },
    onError: (e) => setTopErr(e instanceof Error ? e.message : String(e)),
  });
  const assets = assetSync.assets;
  const handleAssetsChange = assetSync.apply;
  const hydrateAssets = assetSync.hydrate;

  // ── Load course + assets from DB on mount / courseId change ────────────
  useEffect(() => {
    if (!courseId) {
      router.replace("/courses");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rec = await courseService.get(courseId);
        if (!rec) {
          router.replace("/courses");
          return;
        }
        if (cancelled) return;
        setCourse(rec.course);
        const map = await courseService.loadAssetsAsMap(courseId);
        const assetMap = new Map<string, AssetFile>();
        for (const [name, file] of map)
          assetMap.set(name, { name, size: file.size, blob: file });
        hydrateAssets(assetMap);
        await setMeta("currentCourseId", courseId);

        // Accept structure from markdown import page (session-passed)
        const mdRaw = sessionStorage.getItem("u-coursebuilder:md-import");
        if (mdRaw) {
          sessionStorage.removeItem("u-coursebuilder:md-import");
          try {
            const chapters = JSON.parse(mdRaw);
            setCourse((prev) => ({ ...prev, chapters: [...prev.chapters, ...chapters] }));
          } catch { /* ignore */ }
        }
        setHydrated(true);
      } catch (e) {
        setTopErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, router, hydrateAssets]);

  // ── Debounced save course → DB ─────────────────────────────────────────
  const { status: saveStatus, savedAt } = useDebouncedAutosave(
    course,
    hydrated && !!courseId,
    600,
    async (v) => {
      if (!courseId) return;
      await courseService.save(courseId, v);
    },
  );

  const handleSave = async () => {
    setTopErr(null);
    try {
      if (linkedFile) {
        await writeHandle(linkedFile.handle, course);
        setLinkedSavedAt(Date.now());
      } else if (fsaSupported) {
        const handle = await saveAsCourseFile(course);
        if (handle) {
          setLinkedFile({ handle, name: handle.name });
          setLinkedSavedAt(Date.now());
        }
      } else {
        downloadCourseJson(course);
      }
    } catch (e) {
      const err = e as { name?: string; message?: string };
      if (err?.name !== "AbortError") setTopErr(err?.message ?? String(e));
    }
  };

  // Auto-write to linked file (debounced)
  useEffect(() => {
    if (!hydrated || !linkedFile) return;
    const t = setTimeout(async () => {
      try {
        await writeHandle(linkedFile.handle, course);
        setLinkedSavedAt(Date.now());
      } catch {
        /* permission lost — ignore */
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [course, hydrated, linkedFile]);

  const issues = useMemo(
    () => validateCourse(course, new Set(assets.keys())),
    [course, assets],
  );
  const hasErrors = issues.some((i) => i.level === "error");
  const readiness = useMemo(
    () => checkUlmoReadiness(course, new Set(assets.keys())),
    [course, assets],
  );

  const addAsset = (file: File, suggestedName?: string): string => {
    const raw = (suggestedName || file.name || `image-${Date.now()}.png`).replace(/\s+/g, "_");
    let fname = raw;
    if (assets.has(fname)) {
      const dotIdx = raw.lastIndexOf(".");
      const ext = dotIdx >= 0 ? raw.slice(dotIdx) : "";
      const base = dotIdx >= 0 ? raw.slice(0, dotIdx) : raw;
      fname = `${base}-${Date.now()}${ext}`;
    }
    const next = new Map(assets);
    next.set(fname, { name: fname, size: file.size, blob: file });
    void handleAssetsChange(next);
    return fname;
  };

  // Rename an asset AND rewrite every asset:// reference in the course (HTML,
  // video transcript srtFile, course thumbnail) atomically — so links don't break.
  const renameAsset = async (oldName: string, rawNew: string) => {
    const newName = rawNew.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9._\-]/g, "");
    if (!newName) { setTopErr("ชื่อใหม่ต้องเป็นตัวอักษร/ตัวเลขภาษาอังกฤษ (a–z, 0–9, . _ -)"); return; }
    if (newName === oldName) return;
    if (assets.has(newName)) { setTopErr(`มีไฟล์ชื่อ "${newName}" อยู่แล้ว`); return; }
    const af = assets.get(oldName);
    if (!af) return;

    // 1) rewrite references in the course (Unicode-aware: catches Thai-named refs too)
    const esc = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`asset:\\/\\/${esc}(?=["'\\s),<]|$)`, "g");
    const nextCourse = structuredClone(course);
    for (const ch of nextCourse.chapters)
      for (const seq of ch.sequentials)
        for (const v of seq.verticals)
          for (const b of v.blocks) {
            if (b.type === "html") b.html = b.html.replace(re, `asset://${newName}`);
            else if (b.type === "video")
              b.transcripts = b.transcripts.map((t) => (t.srtFile === oldName ? { ...t, srtFile: newName } : t));
          }
    if (nextCourse.about.courseImageName === oldName) nextCourse.about.courseImageName = newName;
    setCourse(nextCourse);

    // 2) rename the asset itself (delete old + add new), preserving bytes
    const blob = af.blob;
    const renamed = blob instanceof File ? new File([blob], newName, { type: blob.type }) : blob;
    const map = new Map(assets);
    map.delete(oldName);
    map.set(newName, { name: newName, size: af.size, blob: renamed });
    await handleAssetsChange(map);
  };

  // Bulk-rename every asset whose name isn't ASCII-safe (Thai, spaces, parens, …)
  // to a slug, updating all references across the course in one atomic operation.
  const fixAllAssetNames = async () => {
    const SAFE = /^[A-Za-z0-9._\-/]+$/;
    const used = new Set(assets.keys());
    const renames: Array<[string, string]> = [];
    let gen = 1;
    for (const oldName of assets.keys()) {
      if (SAFE.test(oldName)) continue;
      const dot = oldName.lastIndexOf(".");
      const ext = dot > 0 ? oldName.slice(dot).replace(/[^A-Za-z0-9.]/g, "").toLowerCase() : "";
      let base = (dot > 0 ? oldName.slice(0, dot) : oldName)
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^[-_.]+|[-_.]+$/g, "")
        .replace(/-{2,}/g, "-");
      if (!base) base = "asset";
      let candidate = base + ext;
      while (used.has(candidate)) candidate = `${base}-${gen++}${ext}`;
      used.add(candidate);
      renames.push([oldName, candidate]);
    }
    if (!renames.length) { setTopErr("ไม่มีไฟล์ชื่อ non-ASCII ให้แก้"); return; }
    const preview = renames.slice(0, 8).map(([o, n]) => `${o} → ${n}`).join("\n");
    if (!confirm(`เปลี่ยนชื่อ ${renames.length} ไฟล์ให้เป็น ASCII และอัพเดตลิงก์ในคอร์สอัตโนมัติ?\n\n${preview}${renames.length > 8 ? `\n…และอีก ${renames.length - 8}` : ""}`)) return;

    const lookup = new Map(renames);
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nextCourse = structuredClone(course);
    for (const ch of nextCourse.chapters)
      for (const seq of ch.sequentials)
        for (const v of seq.verticals)
          for (const b of v.blocks) {
            if (b.type === "html") {
              let h = b.html;
              for (const [o, n] of renames) {
                if (!h.includes(`asset://${o}`)) continue;
                h = h.replace(new RegExp(`asset:\\/\\/${esc(o)}(?=["'\\s),<]|$)`, "g"), `asset://${n}`);
              }
              b.html = h;
            } else if (b.type === "video") {
              b.transcripts = b.transcripts.map((t) => (lookup.has(t.srtFile) ? { ...t, srtFile: lookup.get(t.srtFile)! } : t));
            }
          }
    if (nextCourse.about.courseImageName && lookup.has(nextCourse.about.courseImageName))
      nextCourse.about.courseImageName = lookup.get(nextCourse.about.courseImageName)!;
    setCourse(nextCourse);

    const map = new Map(assets);
    for (const [o, n] of renames) {
      const af = map.get(o);
      if (!af) continue;
      map.delete(o);
      const blob = af.blob;
      const renamed = blob instanceof File ? new File([blob], n, { type: blob.type }) : blob;
      map.set(n, { name: n, size: af.size, blob: renamed });
    }
    await handleAssetsChange(map);
    setTopErr(null);
  };

  const insertBulk = (problems: ProblemBlock[]) => {
    if (!bulkTarget) return;
    const next = structuredClone(course);
    next.chapters[bulkTarget.ci].sequentials[bulkTarget.si].verticals[bulkTarget.vi].blocks.push(
      ...problems,
    );
    setCourse(next);
    setBulkTarget(null);
  };

  const openBulkForCurrent = () => {
    if (sel) setBulkTarget({ ci: sel.ci, si: sel.si, vi: sel.vi });
  };

  return (
    <div className="flex h-screen flex-col bg-default-50">
      <Navbar
        hideModeNav
        showBackToCourses
        brand={
          <div className="flex max-w-xs items-center gap-2 truncate text-sm font-medium text-default-700">
            <span className="truncate">{course.course.displayName}</span>
          </div>
        }
        left={
          <>
            <div className="ml-2 flex items-center">
              {linkedFile ? (
                <span
                  className="flex max-w-[180px] items-center gap-1 truncate rounded-md bg-success/10 px-2 py-1 text-2xs font-medium text-success ring-1 ring-success/20"
                  title={`เชื่อมกับไฟล์ ${linkedFile.name}`}
                >
                  <Link2 size={11} />
                  <span className="truncate">{linkedFile.name}</span>
                  {linkedSavedAt && <CheckCircle2 size={11} />}
                </span>
              ) : (
                <SaveIndicator status={saveStatus} savedAt={savedAt} />
              )}
            </div>
            <div className="ml-2">
              <CourseSwitcher currentCourseId={courseId} />
            </div>
          </>
        }
        right={
          <>
            {courseId && (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 size={14} className="me-1.5" /> แชร์
              </Button>
            )}

            <ExportButton course={course} assets={assets} disabled={hasErrors} />

            {/* เพิ่มเติม — รวม action รอง */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" title="เพิ่มเติม" aria-label="เพิ่มเติม" className="!px-2">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setInfoOpen(true)}>
                  <Info size={13} className="me-2 text-default-500" /> ข้อมูลคอร์ส (Course Info)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSave}>
                  <Save size={13} className="me-2 text-default-500" />
                  {linkedFile ? "บันทึกลงไฟล์ที่ผูก" : "ดาวน์โหลด JSON"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => xmlRef.current?.open()}>
                  <FileCode2 size={13} className="me-2 text-default-500" /> Import XML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => olxRef.current?.open()}>
                  <PackageOpen size={13} className="me-2 text-default-500" /> Import OLX (.tar.gz)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6" />

            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "ซ่อน sidebar" : "แสดง sidebar"}
              aria-label={sidebarOpen ? "ซ่อน sidebar" : "แสดง sidebar"}
              className="ml-1 grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </>
        }
      />

      {/* Hidden dropzones + transient dialogs */}
      <JsonDropzone
        ref={xmlRef}
        onLoad={(c) => { setCourse(c); setImportWarnings([]); }}
        onError={setTopErr}
        onWarnings={setImportWarnings}
      />
      <OlxDropzone
        ref={olxRef}
        onLoad={(c, w, olxAssets) => {
          setCourse(c);
          setImportWarnings(w);
          setTopErr(null);
          if (olxAssets.size > 0) {
            const next = new Map(assets);
            for (const [name, file] of olxAssets)
              next.set(name, { name, size: file.size, blob: file });
            void handleAssetsChange(next);
          }
        }}
        onError={setTopErr}
      />

      {topErr && (
        <div className="border-b bg-destructive/10 px-4 py-1.5 text-xs text-destructive">{topErr}</div>
      )}
      <Dialog open={importWarnings.length > 0} onOpenChange={(open) => { if (!open) setImportWarnings([]); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import สำเร็จ — พบ {importWarnings.length} รายการที่ถูกปรับแก้อัตโนมัติ</DialogTitle>
          </DialogHeader>
          <ul className="max-h-[60vh] overflow-auto list-disc space-y-1 pl-5 text-sm text-default-700">
            {importWarnings.map((w, i) => <li key={i} className="break-words">{w}</li>)}
          </ul>
          <DialogFooter>
            <Button size="sm" onClick={() => setImportWarnings([])}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main
        className={cn(
          "grid flex-1 gap-4 overflow-hidden p-4 transition-[grid-template-columns] duration-200",
          sidebarOpen ? "grid-cols-12" : "grid-cols-9",
        )}
      >
        <Card
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            sidebarOpen ? "col-span-4" : "col-span-3",
          )}
        >
          <CardHeader className="shrink-0 border-b py-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-default-500">
              โครงสร้างคอร์ส
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto p-3">
            <CourseOutline
              course={course}
              onChange={setCourse}
              onSelectBlock={(p) => { setSel(p); setSeqSel(null); }}
              onSelectSequential={(p) => { setSeqSel(p); setSel(null); }}
              onMarkdownImport={() => router.push(courseId ? `/markdown?courseId=${courseId}` : "/markdown")}
            />
          </CardContent>
        </Card>

        <Card
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            sidebarOpen ? "col-span-5" : "col-span-6",
          )}
        >
          <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b py-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-default-500">
              ตัวแก้ไข
            </CardTitle>
            {sel && !seqSel && (
              <Button variant="soft" color="primary" size="sm" onClick={openBulkForCurrent}>
                <Plus size={12} className="me-1" /> Bulk Import
              </Button>
            )}
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto p-5">
            {seqSel ? (
              <SequentialEditor course={course} path={seqSel} onChange={setCourse} />
            ) : sel ? (
              <BlockEditor
                course={course}
                path={sel}
                onChange={setCourse}
                assets={assets}
                onAddAsset={addAsset}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                เลือก block หรือ หัวข้อ จาก outline ทางซ้าย
              </div>
            )}
          </CardContent>
        </Card>

        {sidebarOpen && (
          <aside className="col-span-3 flex min-h-0 flex-col gap-4">
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b py-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-default-500">
                  รูปภาพ / ไฟล์
                </CardTitle>
                <div className="flex items-center gap-1">
                  {(() => {
                    const unsafe = Array.from(assets.keys()).filter((k) => !/^[A-Za-z0-9._\-/]+$/.test(k));
                    if (unsafe.length === 0) return null;
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!h-6 !px-2 !text-2xs text-default-500 hover:text-primary"
                        title={`เปลี่ยนชื่อไฟล์ที่ไม่ใช่ ASCII (${unsafe.length} ไฟล์) ให้เป็นอังกฤษ + อัพเดตลิงก์อัตโนมัติ`}
                        onClick={fixAllAssetNames}
                      >
                        แก้ชื่อไฟล์ ({unsafe.length})
                      </Button>
                    );
                  })()}
                  {(() => {
                    const referenced = courseService.collectAssetRefs(course);
                    const orphans = Array.from(assets.keys()).filter((k) => !referenced.has(k));
                    if (orphans.length === 0) return null;
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!h-6 !px-2 !text-2xs text-default-500 hover:text-destructive"
                        title={`ลบ asset ที่ไม่ได้ใช้แล้ว (${orphans.length} ไฟล์)`}
                        onClick={async () => {
                          if (!courseId) return;
                          if (!confirm(`ลบ ${orphans.length} asset ที่ไม่มี block อ้างถึง?\n\n${orphans.slice(0, 8).join("\n")}${orphans.length > 8 ? `\n…และอีก ${orphans.length - 8}` : ""}`)) return;
                          await courseService.purgeOrphanAssets(courseId, course);
                          const next = new Map(assets);
                          for (const o of orphans) next.delete(o);
                          await handleAssetsChange(next);
                        }}
                      >
                        ล้าง orphan ({orphans.length})
                      </Button>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-3">
                <AssetUploader assets={assets} onChange={handleAssetsChange} onRename={renameAsset} />
              </CardContent>
            </Card>
            <Card className="flex max-h-[40%] shrink-0 flex-col overflow-hidden">
              <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b py-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-default-500">
                  ตรวจสอบ
                </CardTitle>
                {hasErrors && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="!h-6 !gap-1 !px-2 !text-2xs text-default-500 hover:text-primary"
                    title="แก้/ลบ block ที่เป็น bug อัตโนมัติ"
                    onClick={() => {
                      setCleanupPreview(cleanCourse(course, new Set(assets.keys())));
                      setCleanupOpen(true);
                    }}
                  >
                    <Sparkles size={12} /> ทำความสะอาด
                  </Button>
                )}
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-2">
                <ValidationPanel issues={issues} />
              </CardContent>
            </Card>
            <Card className="flex max-h-[45%] shrink-0 flex-col overflow-hidden">
              <CardHeader className="shrink-0 border-b py-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-default-500">
                  ความพร้อม Ulmo
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-3">
                <ReadinessPanel report={readiness} />
              </CardContent>
            </Card>
          </aside>
        )}
      </main>

      {bulkTarget && <BulkProblemImport onImport={insertBulk} onClose={() => setBulkTarget(null)} />}

      <CourseInfoDialog
        open={infoOpen}
        course={course}
        onChange={setCourse}
        onClose={() => setInfoOpen(false)}
        assets={assets}
        onAssetsChange={handleAssetsChange}
        onAddAsset={addAsset}
      />

      {courseId && (
        <ShareDialog
          resourceType="course"
          resourceId={courseId}
          resourceTitle={course.course.displayName}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}

      <CleanupDialog
        open={cleanupOpen}
        onOpenChange={setCleanupOpen}
        actions={cleanupPreview?.actions ?? []}
        onConfirm={() => {
          if (cleanupPreview) {
            setCourse(cleanupPreview.course);
            setSel({ ci: 0, si: 0, vi: 0, bi: 0 });
            setSeqSel(null);
          }
          setCleanupOpen(false);
        }}
      />

    </div>
  );
}

