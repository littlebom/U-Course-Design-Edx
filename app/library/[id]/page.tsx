"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Library as LibIcon, Download, Plus, Trash2, FolderTree, Info, ChevronDown, FileText, HelpCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SaveIndicator } from "@/components/SaveIndicator";
import { LibraryInfoDialog } from "@/components/LibraryInfoDialog";
import { BlockEditor } from "@/components/BlockEditor";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Block, Course } from "@/lib/schema";
import type {
  Library,
  LibraryEntity,
  LibraryContainer,
  LibraryXBlock,
  ContainerKind,
} from "@/lib/library/schema";
import { isContainer, isXBlock } from "@/lib/library/schema";
import { getLibrary, saveLibrary } from "@/lib/db/libraries";
import { loadLibraryAssetsAsMap } from "@/lib/db/library-assets";
import { downloadLibraryZip } from "@/lib/library/export";
import { cn } from "@/lib/utils";
import { getBlockVisuals } from "@/lib/blockMeta";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function LibraryEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const libraryId = params?.id;

  const [library, setLibrary] = useState<Library | null>(null);
  const [assets, setAssets] = useState<Map<string, File>>(new Map());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!libraryId) { router.replace("/libraries"); return; }
    let cancelled = false;
    (async () => {
      try {
        const rec = await getLibrary(libraryId);
        if (!rec) { router.replace("/libraries"); return; }
        if (cancelled) return;
        setLibrary(rec.library);
        setAssets(await loadLibraryAssetsAsMap(libraryId));
        setHydrated(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [libraryId, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated || !library || !libraryId) return;
    const t = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await saveLibrary(libraryId, library);
        setSaveStatus("saved");
        setSavedAt(Date.now());
      } catch (e) {
        setSaveStatus("error");
        setErr(e instanceof Error ? e.message : String(e));
      }
    }, 600);
    return () => clearTimeout(t);
  }, [library, hydrated, libraryId]);

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
    await downloadLibraryZip(library, assets);
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
          <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b py-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-default-500">
              <FolderTree size={13} className="me-1 inline" /> Entities
            </CardTitle>
            <AddEntityMenu onAdd={(k) => {
              update((l) => {
                if (k === "xblock-problem") {
                  const uuid = crypto.randomUUID();
                  l.entities.push({
                    kind: "xblock",
                    key: `xblock.v1:problem:${uuid}`,
                    title: "New Problem",
                    xblockType: "problem",
                    uuid,
                    draftVersion: 1,
                    publishedVersion: 1,
                    canStandAlone: true,
                    block: {
                      type: "problem",
                      displayName: "New Problem",
                      problemType: "multiplechoice",
                      question: "<p>คำถาม</p>",
                      choices: [
                        { text: "ตัวเลือก 1", correct: true },
                        { text: "ตัวเลือก 2", correct: false },
                      ],
                    },
                  });
                } else if (k === "xblock-html") {
                  const uuid = crypto.randomUUID();
                  l.entities.push({
                    kind: "xblock",
                    key: `xblock.v1:html:${uuid}`,
                    title: "New HTML",
                    xblockType: "html",
                    uuid,
                    draftVersion: 1,
                    publishedVersion: 1,
                    canStandAlone: true,
                    block: { type: "html", displayName: "New HTML", html: "<p>เนื้อหา</p>" },
                  });
                } else {
                  const containerKind = k as ContainerKind;
                  const slug = `${containerKind}-${Math.random().toString(36).slice(2, 8)}`;
                  l.entities.push({
                    kind: "container",
                    key: slug,
                    title: `New ${containerKind}`,
                    containerKind,
                    draftVersion: 1,
                    publishedVersion: 1,
                    canStandAlone: true,
                    children: [],
                  });
                }
              });
            }} />
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto p-2">
            {library.entities.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-default-400">
                ยังไม่มี entity — กด + เพื่อเพิ่ม
              </div>
            ) : (
              <ul className="space-y-0.5">
                {library.entities.map((e) => (
                  <EntityRow
                    key={e.key}
                    entity={e}
                    selected={selectedKey === e.key}
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

function entityTitle(e: LibraryEntity): string {
  return e.title || e.key;
}

function EntityRow({
  entity, selected, onClick, onDelete,
}: {
  entity: LibraryEntity;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const containerColors: Record<ContainerKind, string> = {
    section: "bg-primary text-primary-foreground",
    subsection: "bg-info text-white",
    unit: "bg-success text-white",
  };
  const vis = entity.kind === "xblock" ? getBlockVisuals((entity.block.type as Block["type"])) : null;
  const Icon = vis?.icon;
  const iconBg = vis?.iconBg ?? "";
  return (
    <li
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        selected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-default-100",
      )}
      onClick={onClick}
    >
      {entity.kind === "container" ? (
        <span className={cn("grid size-6 shrink-0 place-items-center rounded text-[10px] font-semibold uppercase", containerColors[entity.containerKind])}>
          {entity.containerKind.charAt(0)}
        </span>
      ) : (
        Icon && (
          <span className={cn("grid size-6 shrink-0 place-items-center rounded text-white", iconBg)}>
            <Icon size={12} />
          </span>
        )
      )}
      <span className="flex-1 truncate">{entityTitle(entity)}</span>
      {entity.kind === "container" && (
        <Badge color="default" className="!h-5 !px-1.5 !text-2xs">
          {entity.containerKind}
        </Badge>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="rounded p-0.5 text-default-400 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        title="ลบ entity"
      >
        <Trash2 size={11} />
      </button>
    </li>
  );
}

function AddEntityMenu({ onAdd }: { onAdd: (kind: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="primary" size="sm">
          <Plus size={12} className="me-1" /> เพิ่ม
          <ChevronDown size={11} className="ms-1 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-default-400">
          Container
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onAdd("section")}>
          <span className="me-2 grid size-4 place-items-center rounded bg-primary text-[10px] font-semibold uppercase text-primary-foreground">S</span>
          Section
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("subsection")}>
          <span className="me-2 grid size-4 place-items-center rounded bg-info text-[10px] font-semibold uppercase text-white">S</span>
          Subsection
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("unit")}>
          <span className="me-2 grid size-4 place-items-center rounded bg-success text-[10px] font-semibold uppercase text-white">U</span>
          Unit
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-default-400">
          XBlock
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onAdd("xblock-problem")}>
          <HelpCircle size={13} className="me-2 text-warning" /> Problem
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("xblock-html")}>
          <FileText size={13} className="me-2 text-default-500" /> HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContainerEditor({
  lib, container, onChange,
}: {
  lib: Library;
  container: LibraryContainer;
  onChange: (fn: (c: LibraryContainer) => void) => void;
}) {
  const childCandidates = lib.entities.filter((e) => e.key !== container.key);
  const childSet = new Set(container.children);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>ชื่อ</Label>
        <Input value={container.title} onChange={(e) => onChange((c) => { c.title = e.target.value; })} />
      </div>
      <div className="space-y-1.5">
        <Label>Key</Label>
        <Input
          className="!font-mono !text-xs"
          value={container.key}
          onChange={(e) => onChange((c) => { c.key = e.target.value; })}
        />
        <p className="text-xs text-default-400">
          ใช้เป็น file slug ใน entities/&lt;key&gt;.toml — ควรเป็น kebab-case ไม่มีเว้นวรรค
        </p>
      </div>
      <div className="space-y-2">
        <Label>Children ({container.children.length})</Label>
        <p className="text-xs text-default-400">ลำดับและสมาชิกของ container นี้</p>
        <div className="max-h-64 space-y-1 overflow-auto rounded-md border p-2">
          {childCandidates.length === 0 ? (
            <p className="py-4 text-center text-xs text-default-400">ไม่มี entity อื่นให้เพิ่ม</p>
          ) : childCandidates.map((cand) => (
            <label key={cand.key} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-default-50">
              <input
                type="checkbox"
                checked={childSet.has(cand.key)}
                onChange={(e) => onChange((c) => {
                  if (e.target.checked) {
                    if (!c.children.includes(cand.key)) c.children.push(cand.key);
                  } else {
                    c.children = c.children.filter((k) => k !== cand.key);
                  }
                })}
              />
              <span className="text-xs font-mono text-default-500">{cand.kind === "container" ? cand.containerKind : cand.xblockType}</span>
              <span className="flex-1 truncate">{entityTitle(cand)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// Adapts LibraryXBlock into a one-block "Course" shape so we can reuse BlockEditor
function XBlockEditor({
  xblock, assets, onChange,
}: {
  xblock: LibraryXBlock;
  assets: Map<string, File>;
  onChange: (fn: (x: LibraryXBlock) => void) => void;
}) {
  // Wrap into a 1-chapter / 1-sequential / 1-vertical / 1-block shape
  const fakeCourse: Course = {
    course: { org: "lib", courseCode: "lib", run: "lib", displayName: "", language: "th", start: "2026-01-01T00:00:00Z", selfPaced: true, invitationOnly: false, catalogVisibility: "both" },
    about: { courseImageName: "", overview: "", shortDescription: "", effort: "", duration: "", subtitle: "", introVideoYoutubeId: "" },
    grading: { cutoffs: { Pass: 0.5 }, graders: [] },
    chapters: [{ displayName: "", sequentials: [{ displayName: "", verticals: [{ displayName: "", blocks: [xblock.block] }] }] }],
  };

  const assetFileMap = new Map(Array.from(assets.entries()).map(([k, f]) => [k, { name: k, size: f.size, blob: f }]));

  return (
    <BlockEditor
      course={fakeCourse}
      path={{ ci: 0, si: 0, vi: 0, bi: 0 }}
      onChange={(next) => {
        const newBlock = next.chapters[0].sequentials[0].verticals[0].blocks[0];
        onChange((x) => {
          x.block = newBlock;
          // Keep the entity title in sync with displayName so list shows the latest name
          x.title = newBlock.displayName;
        });
      }}
      assets={assetFileMap}
      onAddAsset={(_file, suggestedName) => suggestedName ?? "asset"}
    />
  );
}
