"use client";

import type { Library, LibraryContainer } from "@/lib/library/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { entityTitle } from "./entityTitle";

export function ContainerEditor({
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
