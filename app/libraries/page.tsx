"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Library as LibIcon, Copy, Download, Plus, Trash2, Upload, RotateCcw, FileJson } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import type { LibraryRecord } from "@/lib/db/libraries";
import {
  listLibraries, createLibrary, softDeleteLibrary, restoreLibrary, hardDeleteLibrary, emptyLibrary,
} from "@/lib/db/libraries";
import { parseLibraryZip } from "@/lib/library/import";
import { downloadLibraryZip } from "@/lib/library/export";
import { putLibraryAsset, loadLibraryAssetsAsMap } from "@/lib/db/library-assets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function LibrariesPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<LibraryRecord[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLibraries(await listLibraries(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const visible = showTrash ? libraries.filter((l) => l.deletedAt) : libraries.filter((l) => !l.deletedAt);

  const handleCreate = async () => {
    const rec = await createLibrary(emptyLibrary());
    router.push(`/library/${rec.id}`);
  };

  const handleImportZip = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const { library, warnings, assets } = await parseLibraryZip(buf);
      const rec = await createLibrary(library);
      for (const [key, f] of assets) await putLibraryAsset(rec.id, key, f);
      if (warnings.length) console.warn("Library import warnings:", warnings);
      router.push(`/library/${rec.id}`);
    } catch (e) {
      alert(`Import ล้มเหลว: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleExport = async (rec: LibraryRecord) => {
    const assets = await loadLibraryAssetsAsMap(rec.id);
    await downloadLibraryZip(rec.library, assets);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        brand={
          <div className="flex items-center gap-2">
            <LibIcon size={16} className="text-primary" />
            <span className="text-sm font-semibold text-default-700">Content Library v2</span>
            <span className="text-xs text-default-400">
              ({libraries.filter((l) => !l.deletedAt).length})
            </span>
          </div>
        }
        right={
          <>
            <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-default px-3 text-xs font-medium text-default hover:bg-default hover:text-default-foreground md:px-4" title="Import library .zip จาก Open edX">
              <Upload size={14} /> Import .zip
              <input
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImportZip(e.target.files[0])}
              />
            </label>
            <Button onClick={handleCreate} color="primary" size="sm">
              <Plus size={14} className="me-1.5" /> สร้าง Library
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
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
          {libraries.some((l) => l.deletedAt) && (
            <button
              onClick={() => setShowTrash(true)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1.5",
                showTrash ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <Trash2 size={12} /> ถังขยะ ({libraries.filter((l) => l.deletedAt).length})
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid place-items-center py-24 text-default-400">กำลังโหลด…</div>
        ) : visible.length === 0 ? (
          <EmptyState onCreate={handleCreate} inTrash={showTrash} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((l) => (
              <LibraryCard
                key={l.id}
                rec={l}
                inTrash={!!l.deletedAt}
                onOpen={() => router.push(`/library/${l.id}`)}
                onDuplicate={async () => {
                  await createLibrary({ ...l.library, learningPackage: { ...l.library.learningPackage, title: `${l.library.learningPackage.title} (Copy)` } });
                  refresh();
                }}
                onExport={() => handleExport(l)}
                onSoftDelete={async () => {
                  if (confirm(`ย้าย "${l.name}" ไปถังขยะ?`)) { await softDeleteLibrary(l.id); refresh(); }
                }}
                onRestore={async () => { await restoreLibrary(l.id); refresh(); }}
                onHardDelete={async () => {
                  if (confirm(`ลบ "${l.name}" ถาวร?`)) { await hardDeleteLibrary(l.id); refresh(); }
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function LibraryCard({
  rec, inTrash, onOpen, onDuplicate, onExport, onSoftDelete, onRestore, onHardDelete,
}: {
  rec: LibraryRecord;
  inTrash: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onSoftDelete: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}) {
  const containerCount = rec.library.entities.filter((e) => e.kind === "container").length;
  const xblockCount = rec.library.entities.filter((e) => e.kind === "xblock").length;
  return (
    <Card className="group flex flex-col">
      <CardHeader className="cursor-pointer pb-2" onClick={inTrash ? undefined : onOpen}>
        <CardTitle className="line-clamp-2 text-base">{rec.name}</CardTitle>
        <div className="text-xs font-mono text-default-500">{rec.library.learningPackage.key}</div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between pt-0">
        <div className="text-xs text-default-500">
          {containerCount} containers · {xblockCount} blocks · บันทึก {new Date(rec.updatedAt).toLocaleString("th-TH")}
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
              <Button size="sm" variant="ghost" onClick={onExport} title="Export .zip">
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

function EmptyState({ onCreate, inTrash }: { onCreate: () => void; inTrash: boolean }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed py-24 text-center">
      <LibIcon size={36} className="mb-3 text-default-300" />
      <p className="mb-1 text-base font-medium">
        {inTrash ? "ถังขยะว่าง" : "ยังไม่มี Library"}
      </p>
      <p className="mb-4 text-sm text-default-400">
        {inTrash ? "Libraries ที่ลบจะอยู่ที่นี่" : "สร้างใหม่หรือ import .zip จาก Open edX Ulmo"}
      </p>
      {!inTrash && (
        <Button size="sm" onClick={onCreate}>
          <Plus size={14} className="me-1" /> สร้าง Library ใหม่
        </Button>
      )}
    </div>
  );
}
