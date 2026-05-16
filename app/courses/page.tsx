"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Copy, Download, Plus, Trash2, Upload, RotateCcw, FileJson, HardDrive, Archive, ArchiveRestore, FileCode2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import type { CourseRecord } from "@/lib/db/types";
import { courseService } from "@/lib/domain";
import { migrateLegacyLocalStorage } from "@/lib/db/migrate";
import { emptyCourseSeed, sampleCourseSeed } from "@/lib/db/seed";
import { downloadBackup, importBackup } from "@/lib/db/backup";
import { getStorageEstimate } from "@/lib/db";
import { courseSchema } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { downloadJson, downloadStatic } from "@/lib/download";
import { cn } from "@/lib/utils";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await courseService.list(true);
      setCourses(list);
      setStorage(await getStorageEstimate());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await courseService.purgeOldTrash(7).catch(() => {});
      const migratedId = await migrateLegacyLocalStorage().catch(() => null);
      await refresh();
      // If just migrated and there's only one course → jump straight into it.
      if (migratedId) router.push(`/?courseId=${migratedId}`);
    })();
  }, [refresh, router]);

  const visible = showTrash ? courses.filter((c) => c.deletedAt) : courses.filter((c) => !c.deletedAt);

  const handleCreate = async (seed: "blank" | "sample") => {
    const course = seed === "blank" ? emptyCourseSeed() : sampleCourseSeed();
    const rec = await courseService.create(course);
    router.push(`/?courseId=${rec.id}`);
  };

  const handleDownloadTemplates = () => {
    for (const path of ["/template.xml", "/problems-learning-design.xml"]) {
      downloadStatic(path);
    }
  };

  const handleRestoreBackup = async (file: File) => {
    try {
      const res = await importBackup(file);
      alert(`นำเข้าสำเร็จ ${res.imported} คอร์ส${res.skipped ? ` · ข้าม ${res.skipped}` : ""}`);
      refresh();
    } catch (err) {
      alert(`Restore ล้มเหลว: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = courseSchema.safeParse(parsed);
      if (!result.success) {
        alert(`JSON ไม่ตรง schema: ${result.error.issues[0]?.message ?? "unknown"}`);
        return;
      }
      const rec = await courseService.create(result.data);
      router.push(`/?courseId=${rec.id}`);
    } catch (e) {
      alert(`Import ล้มเหลว: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        brand={
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <span className="text-sm font-semibold text-default-700">รายวิชาของฉัน</span>
            <span className="text-xs text-default-400">
              ({courses.filter((c) => !c.deletedAt).length} รายวิชา
              {courses.some((c) => c.deletedAt) && ` · ${courses.filter((c) => c.deletedAt).length} ในถังขยะ`})
            </span>
          </div>
        }
        right={
          <>
            <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-default px-3 text-xs font-medium text-default hover:bg-default hover:text-default-foreground md:px-4" title="Import course จาก JSON ไฟล์">
              <Upload size={14} /> Import JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImportJson(e.target.files[0])}
              />
            </label>
            <Button onClick={handleDownloadTemplates} variant="outline" size="sm" title="ดาวน์โหลด XML template สำหรับสร้างคอร์สแบบ structured">
              <FileCode2 size={14} className="me-1.5" /> XML Template
            </Button>
            <Button onClick={() => handleCreate("blank")} variant="outline" size="sm">
              <FileJson size={14} className="me-1.5" /> สร้างคอร์สเปล่า
            </Button>
            <Button onClick={() => handleCreate("sample")} color="primary" size="sm">
              <Plus size={14} className="me-1.5" /> สร้างจากตัวอย่าง
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {error && <DbErrorBanner error={error} />}

        {storage && storage.quota > 0 && (
          <StorageBar
            usage={storage.usage}
            quota={storage.quota}
            onBackup={() => downloadBackup()}
            onRestore={handleRestoreBackup}
          />
        )}

        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => setShowTrash(false)}
            className={cn(
              "rounded-md px-3 py-1.5",
              !showTrash ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            ทั้งหมด
          </button>
          {courses.some((c) => c.deletedAt) && (
            <button
              onClick={() => setShowTrash(true)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1.5",
                showTrash ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <Trash2 size={12} /> ถังขยะ ({courses.filter((c) => c.deletedAt).length})
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid place-items-center py-24 text-default-400">กำลังโหลด…</div>
        ) : visible.length === 0 ? (
          <EmptyState
            onCreate={() => handleCreate("sample")}
            onDownloadTemplate={handleDownloadTemplates}
            inTrash={showTrash}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((c) => (
              <CourseCard
                key={c.id}
                rec={c}
                inTrash={!!c.deletedAt}
                onOpen={() => router.push(`/?courseId=${c.id}`)}
                onDuplicate={async () => {
                  await courseService.duplicate(c.id);
                  refresh();
                }}
                onSoftDelete={async () => {
                  if (confirm(`ย้าย "${c.name}" ไปถังขยะ?`)) {
                    await courseService.softDelete(c.id);
                    refresh();
                  }
                }}
                onRestore={async () => {
                  await courseService.restore(c.id);
                  refresh();
                }}
                onHardDelete={async () => {
                  if (confirm(`ลบ "${c.name}" ถาวร? ไม่สามารถกู้คืนได้`)) {
                    await courseService.hardDelete(c.id);
                    refresh();
                  }
                }}
                onExport={() => downloadJson(c.course, `${c.course.course.courseCode}-${c.course.course.run}.json`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CourseCard({
  rec, inTrash, onOpen, onDuplicate, onSoftDelete, onRestore, onHardDelete, onExport,
}: {
  rec: CourseRecord;
  inTrash: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onSoftDelete: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
  onExport: () => void;
}) {
  const c = rec.course.course;
  const chCount = rec.course.chapters.length;
  const blockCount = rec.course.chapters.reduce(
    (n, ch) => n + ch.sequentials.reduce((m, s) => m + s.verticals.reduce((k, v) => k + v.blocks.length, 0), 0),
    0,
  );
  return (
    <Card className="group flex flex-col">
      <CardHeader className="cursor-pointer pb-2" onClick={inTrash ? undefined : onOpen}>
        <CardTitle className="line-clamp-2 text-base">{rec.name}</CardTitle>
        <div className="flex items-center gap-1 text-xs text-default-500">
          <span className="font-mono">{c.org}</span>
          <span>·</span>
          <span className="font-mono">{c.courseCode}</span>
          <span>·</span>
          <span className="font-mono">{c.run}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between pt-0">
        <div className="text-xs text-default-500">
          {chCount} sections · {blockCount} blocks · บันทึก {new Date(rec.updatedAt).toLocaleString("th-TH")}
        </div>
        <div className="mt-3 flex items-center gap-1">
          {inTrash ? (
            <>
              <Button size="sm" variant="outline" onClick={onRestore}>
                <RotateCcw size={12} className="me-1" /> กู้คืน
              </Button>
              <Button size="sm" variant="outline" color="destructive" onClick={onHardDelete}>
                <Trash2 size={12} className="me-1" /> ลบถาวร
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={onOpen}>เปิด</Button>
              <Button size="sm" variant="ghost" onClick={onDuplicate} title="ทำสำเนา">
                <Copy size={12} />
              </Button>
              <Button size="sm" variant="ghost" onClick={onExport} title="Export JSON">
                <Download size={12} />
              </Button>
              <Button size="sm" variant="ghost" color="destructive" onClick={onSoftDelete} title="ย้ายไปถังขยะ">
                <Trash2 size={12} />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StorageBar({
  usage, quota, onBackup, onRestore,
}: {
  usage: number;
  quota: number;
  onBackup: () => void;
  onRestore: (file: File) => void;
}) {
  const pct = quota === 0 ? 0 : Math.min(100, (usage / quota) * 100);
  const usedMb = (usage / 1024 / 1024).toFixed(1);
  const quotaMb = (quota / 1024 / 1024).toFixed(0);
  const isWarn = pct > 80;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-xs">
      <HardDrive size={14} className="text-default-400" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-default-500">
            ใช้ {usedMb} MB จาก {quotaMb} MB ({pct.toFixed(1)}%)
          </span>
          {isWarn && <span className="text-destructive">พื้นที่ใกล้เต็ม</span>}
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-default-100">
          <div
            className={isWarn ? "h-full bg-destructive" : "h-full bg-primary"}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onBackup} title="สำรองข้อมูลทุกคอร์ส + assets เป็น JSON ไฟล์เดียว">
          <Archive size={12} className="me-1" /> Backup
        </Button>
        <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-3 text-xs font-medium text-default hover:bg-default hover:text-default-foreground md:px-4" title="กู้คืนจากไฟล์ backup (สร้างคอร์สใหม่ ไม่ทับของเดิม)">
          <ArchiveRestore size={12} /> Restore
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onRestore(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function EmptyState({
  onCreate, onDownloadTemplate, inTrash,
}: {
  onCreate: () => void;
  onDownloadTemplate: () => void;
  inTrash: boolean;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed py-24 text-center">
      <BookOpen size={36} className="mb-3 text-default-300" />
      <p className="mb-1 text-base font-medium">
        {inTrash ? "ถังขยะว่าง" : "ยังไม่มีรายวิชา"}
      </p>
      <p className="mb-4 text-sm text-default-400">
        {inTrash ? "คอร์สที่ลบจะอยู่ที่นี่ 7 วันก่อนลบถาวร" : "เริ่มต้นโดยสร้างรายวิชาใหม่"}
      </p>
      {!inTrash && (
        <>
          <Button size="sm" onClick={onCreate}>
            <Plus size={14} className="me-1" /> สร้างรายวิชา
          </Button>
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="mt-3 inline-flex items-center gap-1 text-xs text-default-400 underline-offset-2 hover:text-primary hover:underline"
          >
            <FileCode2 size={11} /> หรือดาวน์โหลด XML Template เพื่อสร้างคอร์สแบบ structured
          </button>
        </>
      )}
    </div>
  );
}
