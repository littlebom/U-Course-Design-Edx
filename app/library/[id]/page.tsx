"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Library as LibIcon, Download, Info, FolderTree, FolderOpen, ImageIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionEditor } from "@/components/CollectionEditor";
import { AssetUploader, type AssetFile } from "@/components/AssetUploader";
import { libraryService } from "@/lib/domain";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveIndicator } from "@/components/SaveIndicator";
import { useAssetSync } from "@/lib/hooks/useAssetSync";
import { useDebouncedAutosave } from "@/lib/hooks/useDebouncedAutosave";
import { LibraryInfoDialog } from "@/components/LibraryInfoDialog";
import type {
  Library,
  LibraryContainer,
  LibraryXBlock,
  ContainerKind,
} from "@/lib/library/schema";
import { isContainer } from "@/lib/library/schema";
import { downloadLibraryZip } from "@/lib/library/export";
import { EntityRow } from "@/components/library/EntityRow";
import { AddEntityMenu, type AddEntityKind } from "@/components/library/AddEntityMenu";
import { ContainerEditor } from "@/components/library/ContainerEditor";
import { XBlockEditor } from "@/components/library/XBlockEditor";
import { entityTitle } from "@/components/library/entityTitle";
import { makeLibraryEntity } from "@/components/library/createEntity";

export default function LibraryEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const libraryId = params?.id;

  const [library, setLibrary] = useState<Library | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<"entities" | "collections" | "assets">("entities");

  // Race-safe asset CRUD via shared hook.
  // Library DB stores Map<string, File> with keys like "shared/<name>" or "<uuid>/<name>".
  // AssetUploader speaks Map<string, AssetFile>; the hook lets us store File directly and
  // adapt at the boundary.
  const assetSync = useAssetSync<File>({
    onPut: async (key, file) => { if (libraryId) await libraryService.putAsset(libraryId, key, file); },
    onDelete: async (key) => { if (libraryId) await libraryService.deleteAsset(libraryId, key); },
    onError: (e) => setErr(e instanceof Error ? e.message : String(e)),
  });
  const assets = assetSync.assets;

  // Adapter: AssetUploader gives us AssetFile, but new uploads should be routed
  // under "shared/<filename>" so they don't collide with per-xblock keys.
  const handleAssetMapChange = useCallback(
    async (next: Map<string, AssetFile>) => {
      const fileMap = new Map<string, File>();
      for (const [k, af] of next) {
        const cleanName = k.replace(/.*\//, "");
        const targetKey = k.includes("/") ? k : `shared/${cleanName}`;
        const file = af.blob instanceof File ? af.blob : new File([af.blob], cleanName);
        fileMap.set(targetKey, file);
      }
      await assetSync.apply(fileMap);
    },
    [assetSync],
  );

  const assetFileView = useMemo(
    () => new Map<string, AssetFile>(
      Array.from(assets.entries()).map(([k, f]) => [k, { name: k, size: f.size, blob: f }]),
    ),
    [assets],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!libraryId) { router.replace("/libraries"); return; }
    let cancelled = false;
    (async () => {
      try {
        const rec = await libraryService.get(libraryId);
        if (!rec) { router.replace("/libraries"); return; }
        if (cancelled) return;
        setLibrary(rec.library);
        assetSync.hydrate(await libraryService.loadAssetsAsMap(libraryId));
        setHydrated(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [libraryId, router, assetSync]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { status: saveStatus, savedAt } = useDebouncedAutosave(
    library,
    hydrated && !!library && !!libraryId,
    600,
    async (v) => { if (libraryId && v) await libraryService.save(libraryId, v); },
  );

  const update = useCallback((fn: (lib: Library) => void) => {
    setLibrary((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const handleExport = async () => {
    if (!library) return;
    const warnings = await downloadLibraryZip(library, assets);
    if (warnings.length > 0) {
      alert(`Export สำเร็จ — มีคำเตือน ${warnings.length} รายการ:\n\n${warnings.join("\n")}`);
    }
  };

  if (!library || !libraryId) {
    return <div className="grid h-screen place-items-center text-default-400">กำลังโหลด…</div>;
  }

  const selected = selectedKey ? library.entities.find((e) => e.key === selectedKey) : null;

  return (
    <div className="flex h-screen flex-col bg-default-50">
      <Navbar
        brand={
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="flex max-w-xs items-center gap-2 truncate rounded px-1.5 py-1 text-sm font-medium text-default-700 hover:bg-default-100"
            title="แก้ไขข้อมูล Library"
          >
            <LibIcon size={14} className="shrink-0 text-primary" />
            <span className="truncate">{library.learningPackage.title}</span>
          </button>
        }
        left={<div className="ml-2"><SaveIndicator status={saveStatus} savedAt={savedAt} /></div>}
        right={
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push("/libraries")}>
              ← Libraries
            </Button>
            <Button variant="outline" size="sm" onClick={() => setInfoOpen(true)}>
              <Info size={14} className="me-1.5" /> Library Info
            </Button>
            <Button color="primary" size="sm" onClick={handleExport}>
              <Download size={14} className="me-1.5" /> Export .zip
            </Button>
          </>
        }
      />

      {err && (
        <div className="border-b bg-destructive/10 px-4 py-1.5 text-xs text-destructive">{err}</div>
      )}

      <main className="grid flex-1 grid-cols-12 gap-4 overflow-hidden p-4">
        <Card className="col-span-4 flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b py-3">
            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as "entities" | "collections")}>
              <TabsList className="bg-default-100 !gap-0.5 !p-0.5">
                <TabsTrigger value="entities" className="!h-6 !px-2 !text-xs">
                  <FolderTree size={11} className="me-1" /> Entities ({library.entities.length})
                </TabsTrigger>
                <TabsTrigger value="collections" className="!h-6 !px-2 !text-xs">
                  <FolderOpen size={11} className="me-1" /> Collections ({library.collections.length})
                </TabsTrigger>
                <TabsTrigger value="assets" className="!h-6 !px-2 !text-xs">
                  <ImageIcon size={11} className="me-1" /> Assets ({assets.size})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {leftTab === "entities" && (
              <AddEntityMenu onAdd={(k: AddEntityKind) => update((l) => { l.entities.push(makeLibraryEntity(k)); })} />
            )}
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto p-2">
            {leftTab === "entities" ? (
              library.entities.length === 0 ? (
                <div className="grid h-full place-items-center text-xs text-default-400">
                  ยังไม่มี entity — กด + เพื่อเพิ่ม
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {library.entities.map((e, idx) => (
                    <EntityRow
                      key={e.key}
                      entity={e}
                      selected={selectedKey === e.key}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < library.entities.length - 1}
                      onMoveUp={() => update((l) => {
                        const i = l.entities.findIndex((x) => x.key === e.key);
                        if (i > 0) [l.entities[i - 1], l.entities[i]] = [l.entities[i], l.entities[i - 1]];
                      })}
                      onMoveDown={() => update((l) => {
                        const i = l.entities.findIndex((x) => x.key === e.key);
                        if (i >= 0 && i < l.entities.length - 1)
                          [l.entities[i], l.entities[i + 1]] = [l.entities[i + 1], l.entities[i]];
                      })}
                      onClick={() => setSelectedKey(e.key)}
                      onDelete={() => {
                        if (!confirm(`ลบ "${entityTitle(e)}"?`)) return;
                        update((l) => {
                          l.entities = l.entities.filter((x) => x.key !== e.key);
                          // also remove from any container's children
                          for (const ent of l.entities) {
                            if (isContainer(ent)) ent.children = ent.children.filter((c) => c !== e.key);
                          }
                          // and from collections
                          for (const c of l.collections) c.entities = c.entities.filter((k) => k !== e.key);
                        });
                        if (selectedKey === e.key) setSelectedKey(null);
                      }}
                    />
                  ))}
                </ul>
              )
            ) : leftTab === "collections" ? (
              <CollectionEditor library={library} onChange={update} />
            ) : (
              <AssetUploader assets={assetFileView} onChange={handleAssetMapChange} />
            )}
          </CardContent>
        </Card>

        <Card className="col-span-8 flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 border-b py-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-default-500">
              {selected ? `แก้ไข: ${entityTitle(selected)}` : "ตัวแก้ไข"}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto p-5">
            {!selected ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                เลือก entity จากรายการกลาง
              </div>
            ) : isContainer(selected) ? (
              <ContainerEditor
                lib={library}
                container={selected}
                onChange={(fn) => update((l) => {
                  const c = l.entities.find((e) => e.key === selected.key) as LibraryContainer | undefined;
                  if (c) fn(c);
                })}
              />
            ) : (
              <XBlockEditor
                xblock={selected}
                assets={assets}
                onChange={(fn) => update((l) => {
                  const x = l.entities.find((e) => e.key === selected.key) as LibraryXBlock | undefined;
                  if (x) fn(x);
                })}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <LibraryInfoDialog
        open={infoOpen}
        library={library}
        onChange={update}
        onClose={() => setInfoOpen(false)}
      />
    </div>
  );
}
