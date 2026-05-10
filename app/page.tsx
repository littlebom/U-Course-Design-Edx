"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Sparkles,
  Plus,
  Info,
  Save,
  RotateCcw,
  CheckCircle2,
  FolderOpen,
  Link2,
  PanelRightOpen,
  PanelRightClose,
  Settings,
} from "lucide-react";
import type { Course, ProblemBlock } from "@/lib/schema";
import { sampleCourse } from "@/lib/sample";
import { validateCourse } from "@/lib/validate";
import { CourseOutline } from "@/components/CourseOutline";
import { BlockEditor } from "@/components/BlockEditor";
import { JsonDropzone } from "@/components/JsonDropzone";
import { AssetUploader, type AssetFile } from "@/components/AssetUploader";
import { ValidationPanel } from "@/components/ValidationPanel";
import { ExportButton } from "@/components/ExportButton";
import { BulkProblemImport } from "@/components/BulkProblemImport";
import { CourseInfoDialog } from "@/components/CourseInfoDialog";
import { clearStorage, downloadCourseJson, loadFromStorage, saveToStorage } from "@/lib/persist";
import {
  openCourseFile,
  saveAsCourseFile,
  supportsFileSystemAccess,
  writeHandle,
  type FileSystemFileHandle,
} from "@/lib/fileHandle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Sel = { ci: number; si: number; vi: number; bi: number } | null;

export default function Page() {
  const [course, setCourse] = useState<Course>(sampleCourse);
  const [assets, setAssets] = useState<Map<string, AssetFile>>(new Map());
  const [sel, setSel] = useState<Sel>({ ci: 0, si: 0, vi: 0, bi: 0 });
  const [bulkTarget, setBulkTarget] = useState<{ ci: number; si: number; vi: number } | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [linkedFile, setLinkedFile] = useState<{ handle: FileSystemFileHandle; name: string } | null>(null);
  const [linkedSavedAt, setLinkedSavedAt] = useState<number | null>(null);
  const [fsaSupported, setFsaSupported] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) setCourse(saved);
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      saveToStorage(course);
      setSavedAt(Date.now());
    }, 500);
    return () => clearTimeout(t);
  }, [course, hydrated]);

  const resetToSample = () => {
    if (confirm("ล้างข้อมูลทั้งหมดและโหลด sample ใหม่?")) {
      clearStorage();
      setLinkedFile(null);
      setCourse(sampleCourse);
    }
  };

  const handleOpenFile = async () => {
    setTopErr(null);
    try {
      const result = await openCourseFile();
      if (!result) return;
      setLinkedFile({ handle: result.handle, name: result.handle.name });
      if (result.course) setCourse(result.course);
    } catch (e) {
      const err = e as { name?: string; message?: string };
      if (err?.name !== "AbortError") setTopErr(err?.message ?? String(e));
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

  const setMeta = <K extends keyof Course["course"]>(key: K, val: Course["course"][K]) =>
    setCourse({ ...course, course: { ...course.course, [key]: val } });

  const addAsset = (file: File, suggestedName?: string): string => {
    const raw = (suggestedName || file.name || `image-${Date.now()}.png`).replace(/\s+/g, "_");
    let fname = raw;
    if (assets.has(fname)) {
      const dotIdx = raw.lastIndexOf(".");
      const ext = dotIdx >= 0 ? raw.slice(dotIdx) : "";
      const base = dotIdx >= 0 ? raw.slice(0, dotIdx) : raw;
      fname = `${base}-${Date.now()}${ext}`;
    }
    setAssets((prev) => {
      const next = new Map(prev);
      next.set(fname, { name: fname, size: file.size, blob: file });
      return next;
    });
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
      <header className="flex flex-wrap items-center gap-3 border-b bg-header px-4 py-2.5 shadow-base">
        <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-base">
          <GraduationCap size={18} />
        </span>

        <Separator orientation="vertical" className="h-6" />

        <div className="text-sm font-medium text-default-700 truncate max-w-md">
          {course.course.displayName}
          <span className="ml-2 text-xs text-default-400">
            {course.course.org}/{course.course.courseCode}/{course.course.run}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {linkedFile ? (
            <span
              className="flex max-w-[200px] items-center gap-1 truncate rounded-md bg-success/10 px-2 py-1 text-[11px] font-medium text-success ring-1 ring-success/20"
              title={`เชื่อมกับไฟล์ ${linkedFile.name}`}
            >
              <Link2 size={11} />
              <span className="truncate">{linkedFile.name}</span>
              {linkedSavedAt && <CheckCircle2 size={11} />}
            </span>
          ) : (
            savedAt && (
              <span className="flex items-center gap-1 text-[11px] text-default-500">
                <CheckCircle2 size={11} /> auto-saved
              </span>
            )
          )}
          <Button variant="outline" size="sm" onClick={() => setInfoOpen(true)}>
            <Info size={14} className="me-1.5" /> Course Info
          </Button>
          {fsaSupported && (
            <Button variant="outline" size="sm" onClick={handleOpenFile}>
              <FolderOpen size={14} className="me-1.5" /> Open File
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save size={14} className="me-1.5" />
            {linkedFile ? "Save" : fsaSupported ? "Save As..." : "Save JSON"}
          </Button>
          <Button variant="outline" size="sm" onClick={resetToSample}>
            <RotateCcw size={14} className="me-1.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCourse(sampleCourse)}>
            <Sparkles size={14} className="me-1.5 text-warning" /> Sample
          </Button>
          <JsonDropzone onLoad={setCourse} onError={setTopErr} />
          <ExportButton course={course} assets={assets} disabled={hasErrors} />
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "ซ่อน sidebar" : "แสดง sidebar"}
            className="!h-9 !w-9"
          >
            {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </Button>
        </div>

        {topErr && (
          <div className="w-full rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive ring-1 ring-destructive/20">
            {topErr}
          </div>
        )}
      </header>

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
            <CourseOutline course={course} onChange={setCourse} onSelectBlock={setSel} />
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
            {sel && (
              <Button variant="soft" color="primary" size="sm" onClick={openBulkForCurrent}>
                <Plus size={12} className="me-1" /> Bulk Import
              </Button>
            )}
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto p-5">
            {sel ? (
              <BlockEditor
                course={course}
                path={sel}
                onChange={setCourse}
                assets={assets}
                onAddAsset={addAsset}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                เลือก block จาก outline ทางซ้าย
              </div>
            )}
          </CardContent>
        </Card>

        {sidebarOpen && (
          <aside className="col-span-3 flex min-h-0 flex-col gap-4">
            <Card className="flex shrink-0 flex-col overflow-hidden">
              <CardHeader className="shrink-0 border-b py-3">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-default-500">
                  <Settings size={13} /> ข้อมูลคอร์ส
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                <MetaField label="org" value={course.course.org} onChange={(v) => setMeta("org", v)} />
                <MetaField
                  label="code"
                  value={course.course.courseCode}
                  onChange={(v) => setMeta("courseCode", v)}
                />
                <MetaField label="run" value={course.course.run} onChange={(v) => setMeta("run", v)} />
                <MetaField
                  label="title"
                  value={course.course.displayName}
                  onChange={(v) => setMeta("displayName", v)}
                />
              </CardContent>
            </Card>
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="shrink-0 border-b py-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-default-500">
                  รูปภาพ / ไฟล์
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-3">
                <AssetUploader assets={assets} onChange={setAssets} />
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
      <CourseInfoDialog
        open={infoOpen}
        course={course}
        onChange={setCourse}
        onClose={() => setInfoOpen(false)}
      />
    </div>
  );
}

function MetaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="!text-[10px] font-semibold uppercase tracking-wider text-default-400">
        {label}
      </Label>
      <Input size="sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
