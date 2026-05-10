"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  Box,
  FileText,
  HelpCircle,
  Video,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  Plus,
  Check,
  X,
} from "lucide-react";
import type { Course, Block } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Path =
  | { kind: "chapter"; ci: number }
  | { kind: "sequential"; ci: number; si: number }
  | { kind: "vertical"; ci: number; si: number; vi: number }
  | { kind: "block"; ci: number; si: number; vi: number; bi: number };

type Props = {
  course: Course;
  onChange: (next: Course) => void;
  onSelectBlock?: (path: { ci: number; si: number; vi: number; bi: number }) => void;
};

export function CourseOutline({ course, onChange, onSelectBlock }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["c0", "c0-s0", "c0-s0-v0"]));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [activeBlock, setActiveBlock] = useState<string | null>("c0-s0-v0-b0");

  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  const startEdit = (key: string, current: string) => {
    setEditing(key);
    setDraft(current);
  };

  const update = (mut: (c: Course) => void) => {
    const next = structuredClone(course);
    mut(next);
    onChange(next);
  };

  const move = <T,>(arr: T[], idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
  };

  const renameNode = (path: Path, name: string) => {
    update((c) => {
      if (path.kind === "chapter") c.chapters[path.ci].displayName = name;
      else if (path.kind === "sequential") c.chapters[path.ci].sequentials[path.si].displayName = name;
      else if (path.kind === "vertical")
        c.chapters[path.ci].sequentials[path.si].verticals[path.vi].displayName = name;
      else c.chapters[path.ci].sequentials[path.si].verticals[path.vi].blocks[path.bi].displayName = name;
    });
    setEditing(null);
  };

  const deleteNode = (path: Path) => {
    update((c) => {
      if (path.kind === "chapter") c.chapters.splice(path.ci, 1);
      else if (path.kind === "sequential") c.chapters[path.ci].sequentials.splice(path.si, 1);
      else if (path.kind === "vertical")
        c.chapters[path.ci].sequentials[path.si].verticals.splice(path.vi, 1);
      else c.chapters[path.ci].sequentials[path.si].verticals[path.vi].blocks.splice(path.bi, 1);
    });
  };

  const moveNode = (path: Path, dir: -1 | 1) => {
    update((c) => {
      if (path.kind === "chapter") move(c.chapters, path.ci, dir);
      else if (path.kind === "sequential") move(c.chapters[path.ci].sequentials, path.si, dir);
      else if (path.kind === "vertical")
        move(c.chapters[path.ci].sequentials[path.si].verticals, path.vi, dir);
      else move(c.chapters[path.ci].sequentials[path.si].verticals[path.vi].blocks, path.bi, dir);
    });
  };

  const addChapter = () =>
    update((c) =>
      c.chapters.push({
        displayName: "บทใหม่",
        sequentials: [
          { displayName: "บทเรียนใหม่", verticals: [{ displayName: "Unit", blocks: [emptyHtml()] }] },
        ],
      }),
    );
  const addSeq = (ci: number) =>
    update((c) =>
      c.chapters[ci].sequentials.push({
        displayName: "บทเรียนใหม่",
        verticals: [{ displayName: "Unit", blocks: [emptyHtml()] }],
      }),
    );
  const addVert = (ci: number, si: number) =>
    update((c) =>
      c.chapters[ci].sequentials[si].verticals.push({
        displayName: "Unit ใหม่",
        blocks: [emptyHtml()],
      }),
    );
  const addBlock = (ci: number, si: number, vi: number, type: "html" | "problem" | "video") =>
    update((c) =>
      c.chapters[ci].sequentials[si].verticals[vi].blocks.push(
        type === "html" ? emptyHtml() : type === "video" ? emptyVideo() : emptyProblem(),
      ),
    );

  const NameRow = ({
    nodeKey,
    icon,
    iconBg,
    name,
    path,
    canExpand,
    isBlock,
    onClick,
  }: {
    nodeKey: string;
    icon: React.ReactNode;
    iconBg: string;
    name: string;
    path: Path;
    canExpand: boolean;
    isBlock?: boolean;
    onClick?: () => void;
  }) => {
    const isOpen = expanded.has(nodeKey);
    const isEditing = editing === nodeKey;
    const isActive = isBlock && activeBlock === nodeKey;
    return (
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors",
          isActive ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-default-100",
        )}
      >
        {canExpand ? (
          <button
            onClick={() => toggle(nodeKey)}
            className="grid size-4 place-items-center text-default-400 hover:text-default-700"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className={cn("grid size-5 shrink-0 place-items-center rounded text-white", iconBg)}>
          {icon}
        </span>
        {isEditing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") renameNode(path, draft);
              if (e.key === "Escape") setEditing(null);
            }}
            className="flex-1 rounded border border-primary bg-background px-1.5 py-0.5 text-sm outline-hidden"
          />
        ) : (
          <button
            onClick={() => {
              if (onClick) onClick();
              else toggle(nodeKey);
              if (isBlock) setActiveBlock(nodeKey);
            }}
            onDoubleClick={() => startEdit(nodeKey, name)}
            className={cn(
              "flex-1 truncate text-left text-sm",
              isActive ? "font-medium text-primary-700" : "text-default-700",
            )}
            title="ดับเบิลคลิกเพื่อแก้ชื่อ"
          >
            {name}
          </button>
        )}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          {isEditing ? (
            <>
              <RowIcon onClick={() => renameNode(path, draft)} title="บันทึก" tone="success">
                <Check size={12} />
              </RowIcon>
              <RowIcon onClick={() => setEditing(null)} title="ยกเลิก">
                <X size={12} />
              </RowIcon>
            </>
          ) : (
            <>
              <RowIcon onClick={() => startEdit(nodeKey, name)} title="แก้ชื่อ">
                <Pencil size={12} />
              </RowIcon>
              <RowIcon onClick={() => moveNode(path, -1)} title="เลื่อนขึ้น">
                <ArrowUp size={12} />
              </RowIcon>
              <RowIcon onClick={() => moveNode(path, 1)} title="เลื่อนลง">
                <ArrowDown size={12} />
              </RowIcon>
              <RowIcon onClick={() => deleteNode(path)} title="ลบ" tone="danger">
                <Trash2 size={12} />
              </RowIcon>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div className="mb-2 flex items-center justify-end">
        <Button size="sm" color="primary" onClick={addChapter}>
          <Plus size={12} className="me-1" /> เพิ่มบท
        </Button>
      </div>

      {course.chapters.map((ch, ci) => {
        const ck = `c${ci}`;
        return (
          <div key={ck}>
            <NameRow
              nodeKey={ck}
              icon={<BookOpen size={12} />}
              iconBg="bg-primary"
              name={ch.displayName}
              path={{ kind: "chapter", ci }}
              canExpand
            />
            {expanded.has(ck) && (
              <div className="ml-3 border-l border-default-200 pl-2">
                {ch.sequentials.map((seq, si) => {
                  const sk = `${ck}-s${si}`;
                  return (
                    <div key={sk}>
                      <NameRow
                        nodeKey={sk}
                        icon={<Layers size={12} />}
                        iconBg="bg-info"
                        name={seq.displayName}
                        path={{ kind: "sequential", ci, si }}
                        canExpand
                      />
                      {expanded.has(sk) && (
                        <div className="ml-3 border-l border-default-200 pl-2">
                          {seq.verticals.map((v, vi) => {
                            const vk = `${sk}-v${vi}`;
                            return (
                              <div key={vk}>
                                <NameRow
                                  nodeKey={vk}
                                  icon={<Box size={12} />}
                                  iconBg="bg-success"
                                  name={v.displayName}
                                  path={{ kind: "vertical", ci, si, vi }}
                                  canExpand
                                />
                                {expanded.has(vk) && (
                                  <div className="ml-3 border-l border-default-200 pl-2">
                                    {v.blocks.map((b, bi) => {
                                      const bk = `${vk}-b${bi}`;
                                      return (
                                        <NameRow
                                          key={bk}
                                          nodeKey={bk}
                                          icon={
                                            b.type === "html" ? (
                                              <FileText size={12} />
                                            ) : b.type === "video" ? (
                                              <Video size={12} />
                                            ) : (
                                              <HelpCircle size={12} />
                                            )
                                          }
                                          iconBg={
                                            b.type === "html"
                                              ? "bg-default-500"
                                              : b.type === "video"
                                                ? "bg-destructive"
                                                : "bg-warning"
                                          }
                                          name={b.displayName}
                                          path={{ kind: "block", ci, si, vi, bi }}
                                          canExpand={false}
                                          isBlock
                                          onClick={() => onSelectBlock?.({ ci, si, vi, bi })}
                                        />
                                      );
                                    })}
                                    <div className="ml-6 mt-1 flex flex-wrap gap-1">
                                      <AddPill onClick={() => addBlock(ci, si, vi, "html")}>
                                        <FileText size={11} /> HTML
                                      </AddPill>
                                      <AddPill onClick={() => addBlock(ci, si, vi, "video")}>
                                        <Video size={11} /> Video
                                      </AddPill>
                                      <AddPill onClick={() => addBlock(ci, si, vi, "problem")}>
                                        <HelpCircle size={11} /> Problem
                                      </AddPill>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="ml-6 mt-1">
                            <AddPill onClick={() => addVert(ci, si)}>
                              <Plus size={11} /> Unit
                            </AddPill>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="ml-6 mt-1">
                  <AddPill onClick={() => addSeq(ci)}>
                    <Plus size={11} /> บทเรียน
                  </AddPill>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RowIcon({
  children,
  onClick,
  title,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "danger" | "success";
}) {
  const cls =
    tone === "danger"
      ? "text-destructive hover:bg-destructive/10"
      : tone === "success"
      ? "text-success hover:bg-success/10"
      : "text-default-500 hover:bg-default-200";
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn("grid size-5 place-items-center rounded transition-colors", cls)}
    >
      {children}
    </button>
  );
}

function AddPill({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-dashed border-default-300 bg-background px-2 py-0.5 text-xs font-medium text-default-600 transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </button>
  );
}

function emptyHtml(): Block {
  return { type: "html", displayName: "HTML ใหม่", html: "<p>...</p>" };
}
function emptyVideo(): Block {
  return { type: "video", displayName: "Video ใหม่", youtubeId: "dQw4w9WgXcQ", downloadAllowed: false };
}
function emptyProblem(): Block {
  return {
    type: "problem",
    displayName: "Problem ใหม่",
    problemType: "multiplechoice",
    question: "<p>คำถาม?</p>",
    choices: [
      { text: "ตัวเลือก 1", correct: true },
      { text: "ตัวเลือก 2", correct: false },
    ],
  };
}
