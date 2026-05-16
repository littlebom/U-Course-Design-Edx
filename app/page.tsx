"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Info,
  Save,
  RotateCcw,
  CheckCircle2,
  Download,
  FileCode2,
  PackageOpen,
  Link2,
  PanelRightOpen,
  PanelRightClose,
  Settings,
  ChevronDown,
} from "lucide-react";
import type { Course, ProblemBlock } from "@/lib/schema";
import { sampleCourse } from "@/lib/sample";
import { validateCourse } from "@/lib/validate";
import { CourseOutline } from "@/components/CourseOutline";
import { BlockEditor } from "@/components/BlockEditor";
import { JsonDropzone, type JsonDropzoneHandle } from "@/components/JsonDropzone";
import { OlxDropzone, type OlxDropzoneHandle } from "@/components/OlxDropzone";
import { AssetUploader, type AssetFile } from "@/components/AssetUploader";
import { ValidationPanel } from "@/components/ValidationPanel";
import { ExportButton } from "@/components/ExportButton";
import { BulkProblemImport } from "@/components/BulkProblemImport";
import { CourseInfoDialog } from "@/components/CourseInfoDialog";
import { SequentialEditor } from "@/components/SequentialEditor";
import { CourseSwitcher } from "@/components/CourseSwitcher";
import { SaveIndicator } from "@/components/SaveIndicator";
import { Navbar } from "@/components/Navbar";
import { downloadCourseJson } from "@/lib/persist";
import { getCourse, saveCourse } from "@/lib/db/courses";
import { setMeta } from "@/lib/db";
import { deleteAsset, loadAssetsAsMap, putAsset } from "@/lib/db/assets";
import {
  saveAsCourseFile,
  supportsFileSystemAccess,
  writeHandle,
  type FileSystemFileHandle,
} from "@/lib/fileHandle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Sel = { ci: number; si: number; vi: number; bi: number } | null;
type SeqSel = { ci: number; si: number } | null;
type SaveStatus = "idle" | "saving" | "saved" | "error";

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
  const [assets, setAssets] = useState<Map<string, AssetFile>>(new Map());
  const [confirmReset, setConfirmReset] = useState(false);
  const [sel, setSel] = useState<Sel>({ ci: 0, si: 0, vi: 0, bi: 0 });
  const [seqSel, setSeqSel] = useState<SeqSel>(null);
  const [bulkTarget, setBulkTarget] = useState<{ ci: number; si: number; vi: number } | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [linkedFile, setLinkedFile] = useState<{ handle: FileSystemFileHandle; name: string } | null>(null);
  const [linkedSavedAt, setLinkedSavedAt] = useState<number | null>(null);
  const [fsaSupported, setFsaSupported] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const xmlRef = useRef<JsonDropzoneHandle>(null);
  const olxRef = useRef<OlxDropzoneHandle>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setFsaSupported(supportsFileSystemAccess());
    const v = localStorage.getItem("olx-builder:sidebar");
    if (v === "0") setSidebarOpen(false);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated) localStorage.setItem("olx-builder:sidebar", sidebarOpen ? "1" : "0");
  }, [sidebarOpen, hydrated]);

  // ── Load course + assets from DB on mount / courseId change ────────────
  useEffect(() => {
    if (!courseId) {
      router.replace("/courses");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rec = await getCourse(courseId);
        if (!rec) {
          router.replace("/courses");
          return;
        }
        if (cancelled) return;
        setCourse(rec.course);
        const map = await loadAssetsAsMap(courseId);
        const assetMap = new Map<string, AssetFile>();
        for (const [name, file] of map)
          assetMap.set(name, { name, size: file.size, blob: file });
        setAssets(assetMap);
        await setMeta("currentCourseId", courseId);

        // Accept structure from markdown import page (session-passed)
        const mdRaw = sessionStorage.getItem("olx-builder:md-import");
        if (mdRaw) {
          sessionStorage.removeItem("olx-builder:md-import");
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
  }, [courseId, router]);

  // ── Debounced save course → DB ─────────────────────────────────────────
  useEffect(() => {
    if (!hydrated || !courseId) return;
    const t = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await saveCourse(courseId, course);
        setSaveStatus("saved");
        setSavedAt(Date.now());
      } catch (e) {
        setSaveStatus("error");
        setTopErr(e instanceof Error ? e.message : String(e));
      }
    }, 600);
    return () => clearTimeout(t);
  }, [course, hydrated, courseId]);

  // ── Asset CRUD: wrap setAssets to sync DB writes ───────────────────────
  const handleAssetsChange = useCallback(async (next: Map<string, AssetFile>) => {
    if (!courseId) { setAssets(next); return; }
    const prevNames = new Set(assets.keys());
    const nextNames = new Set(next.keys());
    setAssets(next);
    // Added or changed → write
    for (const [name, af] of next) {
      const prev = assets.get(name);
      if (!prev || prev.blob !== af.blob) {
        await putAsset(courseId, af.blob instanceof File ? af.blob : new File([af.blob], name), name);
      }
    }
    // Removed → delete
    for (const name of prevNames) {
      if (!nextNames.has(name)) await deleteAsset(courseId, name);
    }
  }, [assets, courseId]);

  const doReset = () => {
    router.push("/courses");
    setConfirmReset(false);
  };

  const handleDownloadTemplates = () => {
    const files = ["/template.xml", "/problems-learning-design.xml"];
    for (const path of files) {
      const a = document.createElement("a");
      a.href = path;
      a.download = path.slice(1);
      a.click();
    }
  };


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
        showBackToCourses
        brand={
          <div className="flex max-w-xs items-center gap-2 truncate text-sm font-medium text-default-700">
            <span className="truncate">{course.course.displayName}</span>
            <span className="text-xs text-default-400">
              {course.course.org}/{course.course.courseCode}/{course.course.run}
            </span>
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
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)} className="text-default-500 hover:text-destructive" title="Reset">
              <RotateCcw size={14} />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button variant="outline" size="sm" onClick={() => setInfoOpen(true)}>
              <Info size={14} className="me-1.5" /> Course Info
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings size={14} className="me-1.5" /> File
                  <ChevronDown size={12} className="ml-1 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-default-400">
                  Import
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => xmlRef.current?.open()}>
                  <FileCode2 size={13} className="me-2 text-default-500" /> Import XML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => olxRef.current?.open()}>
                  <PackageOpen size={13} className="me-2 text-default-500" /> Import OLX (.tar.gz)
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-default-400">
                  Template
                </DropdownMenuLabel>
                {fsaSupported && (
                  <DropdownMenuItem onClick={handleDownloadTemplates}>
                    <Download size={13} className="me-2 text-default-500" /> XML Template
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-default-400">
                  Save & Export
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleSave}>
                  <Save size={13} className="me-2 text-default-500" />
                  {linkedFile ? "Save" : fsaSupported ? "Save As..." : "Save JSON"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6" />

            <ExportButton course={course} assets={assets} disabled={hasErrors} />

            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} title="แสดง sidebar" className="!h-9 !w-9">
                <PanelRightOpen size={16} />
              </Button>
            )}
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
            <Button onClick={() => setImportWarnings([])}>ปิด</Button>
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
              onMarkdownImport={() => router.push("/markdown")}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="!h-7 !w-7 text-default-400 hover:text-default-700"
                  onClick={() => setSidebarOpen(false)}
                  title="ซ่อน sidebar"
                >
                  <PanelRightClose size={14} />
                </Button>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-3">
                <AssetUploader assets={assets} onChange={handleAssetsChange} />
              </CardContent>
            </Card>
            <Card className="flex max-h-[40%] shrink-0 flex-col overflow-hidden">
              <CardHeader className="shrink-0 border-b py-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-default-500">
                  ตรวจสอบ
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-2">
                <ValidationPanel issues={issues} />
              </CardContent>
            </Card>
          </aside>
        )}
      </main>

      {bulkTarget && <BulkProblemImport onImport={insertBulk} onClose={() => setBulkTarget(null)} />}

      <Dialog open={confirmReset} onOpenChange={(o) => !o && setConfirmReset(false)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw size={15} /> ยืนยันการ Reset
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-default-600">ล้างข้อมูลทั้งหมดและโหลด course ตัวอย่างใหม่ใช่หรือไม่?</p>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>ยกเลิก</Button>
            <Button color="destructive" size="sm" onClick={doReset}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CourseInfoDialog
        open={infoOpen}
        course={course}
        onChange={setCourse}
        onClose={() => setInfoOpen(false)}
        assets={assets}
        onAssetsChange={handleAssetsChange}
      />


    </div>
  );
}

