"use client";

import { useState } from "react";
import { Plus, Trash2, FolderOpen, Pencil, Check, X } from "lucide-react";
import type { Library, LibraryCollection } from "@/lib/library/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  library: Library;
  onChange: (fn: (l: Library) => void) => void;
};

// Slug helper — keeps keys URL-safe & TOML-friendly
function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || `collection-${Date.now()}`;
}

export function CollectionEditor({ library, onChange }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const handleCreate = () => {
    const title = prompt("ชื่อ Collection ใหม่:");
    if (!title?.trim()) return;
    onChange((l) => {
      const key = slugify(title);
      l.collections.push({
        key,
        title: title.trim(),
        description: "",
        created: new Date().toISOString(),
        entities: [],
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-default-500">
          จัดกลุ่ม entities ข้าม container ได้ — entity เดียวอยู่ได้หลาย collection
        </p>
        <Button size="sm" variant="outline" onClick={handleCreate}>
          <Plus size={12} className="me-1" /> เพิ่ม Collection
        </Button>
      </div>

      {library.collections.length === 0 ? (
        <div className="grid place-items-center rounded-md border border-dashed py-8 text-xs text-default-400">
          <FolderOpen size={20} className="mb-1.5" />
          ยังไม่มี collection
        </div>
      ) : (
        <ul className="space-y-2">
          {library.collections.map((c) => (
            <CollectionItem
              key={c.key}
              library={library}
              collection={c}
              expanded={editingKey === c.key}
              onToggle={() => setEditingKey(editingKey === c.key ? null : c.key)}
              onUpdate={(fn) => onChange((l) => {
                const target = l.collections.find((x) => x.key === c.key);
                if (target) fn(target);
              })}
              onDelete={() => {
                if (!confirm(`ลบ collection "${c.title}"? (จะไม่ลบ entities)`)) return;
                onChange((l) => { l.collections = l.collections.filter((x) => x.key !== c.key); });
                if (editingKey === c.key) setEditingKey(null);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CollectionItem({
  library, collection, expanded, onToggle, onUpdate, onDelete,
}: {
  library: Library;
  collection: LibraryCollection;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (fn: (c: LibraryCollection) => void) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(collection.title);

  const memberSet = new Set(collection.entities);

  return (
    <li className="rounded-md border border-default-200 bg-card">
      <div className="flex items-center gap-2 p-2">
        <FolderOpen size={14} className="shrink-0 text-default-400" />
        {renaming ? (
          <>
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { onUpdate((c) => { c.title = draftTitle.trim() || c.title; }); setRenaming(false); } }}
              className="flex-1 !h-7"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="!h-7 !w-7" onClick={() => { onUpdate((c) => { c.title = draftTitle.trim() || c.title; }); setRenaming(false); }}>
              <Check size={12} />
            </Button>
            <Button size="icon" variant="ghost" className="!h-7 !w-7" onClick={() => { setDraftTitle(collection.title); setRenaming(false); }}>
              <X size={12} />
            </Button>
          </>
        ) : (
          <>
            <button type="button" onClick={onToggle} className="flex-1 text-left text-sm font-medium">
              {collection.title}
              <span className="ml-2 text-xs font-normal text-default-400">({collection.entities.length} entities)</span>
            </button>
            <Button size="icon" variant="ghost" className="!h-7 !w-7 text-default-400" onClick={() => { setDraftTitle(collection.title); setRenaming(true); }} title="แก้ชื่อ">
              <Pencil size={11} />
            </Button>
            <Button size="icon" variant="ghost" color="destructive" className="!h-7 !w-7" onClick={onDelete} title="ลบ collection">
              <Trash2 size={11} />
            </Button>
          </>
        )}
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-default-200 p-2">
          <div className="space-y-1">
            <Label className="!text-xs">คำอธิบาย</Label>
            <Textarea
              rows={2}
              value={collection.description}
              onChange={(e) => onUpdate((c) => { c.description = e.target.value; })}
              placeholder="(ไม่บังคับ)"
              className="!text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="!text-xs">Entities ใน collection นี้</Label>
            {library.entities.length === 0 ? (
              <p className="text-xs text-default-400">ยังไม่มี entity ใน library ให้เลือก</p>
            ) : (
              <div className="max-h-48 space-y-0.5 overflow-auto rounded border border-default-200 bg-default-50 p-1">
                {library.entities.map((e) => (
                  <label key={e.key} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-default-100">
                    <input
                      type="checkbox"
                      checked={memberSet.has(e.key)}
                      onChange={(ev) => onUpdate((c) => {
                        if (ev.target.checked) {
                          if (!c.entities.includes(e.key)) c.entities.push(e.key);
                        } else {
                          c.entities = c.entities.filter((k) => k !== e.key);
                        }
                      })}
                    />
                    <span className="font-mono text-2xs text-default-400 shrink-0">
                      {e.kind === "container" ? e.containerKind : e.xblockType}
                    </span>
                    <span className="flex-1 truncate">{e.title || e.key}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
