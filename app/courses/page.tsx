"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Copy, Download, Plus, Trash2, Upload, RotateCcw, FileJson, HardDrive, Archive, ArchiveRestore } from "lucide-react";
import type { CourseRecord } from "@/lib/db/types";
import {
  listCourses, createCourse, duplicateCourse,
  softDeleteCourse, restoreCourse, hardDeleteCourse, purgeOldTrash,
} from "@/lib/db/courses";
import { migrateLegacyLocalStorage } from "@/lib/db/migrate";
import { emptyCourseSeed, sampleCourseSeed } from "@/lib/db/seed";
import { downloadBackup, importBackup } from "@/lib/db/backup";
import { getStorageEstimate } from "@/lib/db";
import { courseSchema } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      const list = await listCourses(true);
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
      await purgeOldTrash(7).catch(() => {});
      const migratedId = await migrateLegacyLocalStorage().catch(() => null);
      await refresh();
      // If just migrated and there's only one course → jump straight into it.
      if (migratedId) router.push(`/?courseId=${migratedId}`);
    })();
  }, [refresh, router]);

  const visible = showTrash ? courses.filter((c) => c.deletedAt) : courses.filter((c) => !c.deletedAt);

  const handleCreate = async (seed: "blank" | "sample") => {
    const course = seed === "blank" ? emptyCourseSeed() : sampleCourseSeed();
    const rec = await createCourse(course);
    router.push(`/?courseId=${rec.id}`);
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
      const rec = await createCourse(result.data);
      router.push(`/?courseId=${rec.id}`);
    } catch (e) {
      alert(`Import ล้มเหลว: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <h1 className="text-lg font-semibold">รายวิชาของฉัน</h1>
            <span className="text-sm text-default-400">
              ({courses.filter((c) => !c.deletedAt).length} รายวิชา
              {courses.some((c) => c.deletedAt) && ` · ${courses.filter((c) => c.deletedAt).length} ในถังขยะ`})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => downloadBackup()} title="สำรองข้อมูลทุกคอร์ส">
              <Archive size={14} className="me-1" /> Backup
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-sm hover:bg-accent" title="กู้คืนจากไฟล์ backup">
              <ArchiveRestore size={14} /> Restore
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const res = await importBackup(f);
                    alert(`นำเข้าสำเร็จ ${res.imported} คอร์ส${res.skipped ? ` · ข้าม ${res.skipped}` : ""}`);
                    refresh();
                  } catch (err) {
                    alert(`Restore ล้มเหลว: ${err instanceof Error ? err.message : String(err)}`);
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
              <Upload size={14} /> Import JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImportJson(e.target.files[0])}
              />
            </label>
            <Button onClick={() => handleCreate("blank")} variant="outline">
              <FileJson size={14} className="me-1" /> สร้างคอร์สเปล่า
            </Button>
            <Button onClick={() => handleCreate("sample")}>
              <Plus size={14} className="me-1" /> สร้างจากตัวอย่าง
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        {storage && storage.quota > 0 && (
          <StorageBar usage={storage.usage} quota={storage.quota} />
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
          <EmptyState onCreate={() => handleCreate("sample")} inTrash={showTrash} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((c) => (
              <CourseCard
                key={c.id}
                rec={c}
                inTrash={!!c.deletedAt}
                onOpen={() => router.push(`/?courseId=${c.id}`)}
                onDuplicate={async () => {
                  await duplicateCourse(c.id);
                  refresh();
                }}
                onSoftDelete={async () => {
                  if (confirm(`ย้าย "${c.name}" ไปถังขยะ?`)) {
                    await softDeleteCourse(c.id);
                    refresh();
                  }
                }}
                onRestore={async () => {
                  await restoreCourse(c.id);
                  refresh();
                }}
                onHardDelete={async () => {
                  if (confirm(`ลบ "${c.name}" ถาวร? ไม่สามารถกู้คืนได้`)) {
                    await hardDeleteCourse(c.id);
                    refresh();
                  }
                }}
                onExport={() => {
                  const blob = new Blob([JSON.stringify(c.course, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${c.course.course.courseCode}-${c.course.course.run}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
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

function StorageBar({ usage, quota }: { usage: number; quota: number }) {
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
    </div>
  );
}

function EmptyState({ onCreate, inTrash }: { onCreate: () => void; inTrash: boolean }) {
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
        <Button onClick={onCreate}>
          <Plus size={14} className="me-1" /> สร้างรายวิชา
        </Button>
      )}
    </div>
  );
}
