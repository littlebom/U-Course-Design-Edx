"use client";

import { Layers, Calendar } from "lucide-react";
import type { Course, Sequential } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Props = {
  course: Course;
  path: { ci: number; si: number };
  onChange: (next: Course) => void;
};

export function SequentialEditor({ course, path, onChange }: Props) {
  const seq = course.chapters[path.ci]?.sequentials[path.si];
  if (!seq) return null;

  const update = (fn: (s: Sequential) => void) => {
    const next = structuredClone(course);
    fn(next.chapters[path.ci].sequentials[path.si]);
    onChange(next);
  };

  const toLocal = (iso?: string) => (iso ? iso.replace("Z", "") : "");
  const toIso = (local: string) => (local ? local + "Z" : undefined);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-md bg-info text-white shadow-base">
          <Layers size={16} />
        </span>
        <div>
          <div className="text-base font-semibold tracking-tight">หัวข้อ (Sequential)</div>
          <Badge color="default" className="mt-0.5">
            {seq.format ? seq.format : "ไม่ได้ให้คะแนน"}
          </Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>ชื่อหัวข้อ (Display Name)</Label>
        <Input value={seq.displayName} onChange={(e) => update((s) => (s.displayName = e.target.value))} />
      </div>

      <div className="space-y-1.5">
        <Label>รูปแบบ / หมวดการให้คะแนน (Format)</Label>
        <Input
          value={seq.format ?? ""}
          onChange={(e) => update((s) => { s.format = e.target.value || undefined; })}
          placeholder="เช่น Quiz, Homework, Examination (ถ้าว่าง = ไม่ให้คะแนน)"
        />
        <p className="text-xs text-default-400">ต้องตรงกับ type ใน Grading Policy เพื่อนับคะแนน</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Calendar size={12} /> วันเปิด (Start)
          </Label>
          <Input
            type="datetime-local"
            value={toLocal(seq.start)}
            onChange={(e) => update((s) => { s.start = toIso(e.target.value); })}
          />
          <p className="text-xs text-default-400">นักศึกษาจะเข้าถึงได้หลังวันนี้</p>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Calendar size={12} /> วันส่ง (Due)
          </Label>
          <Input
            type="datetime-local"
            value={toLocal(seq.due)}
            onChange={(e) => update((s) => { s.due = toIso(e.target.value); })}
          />
          <p className="text-xs text-default-400">งานที่ส่งหลังวันนี้จะถูกหักคะแนน/ปฏิเสธ</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Show Correctness</Label>
        <select
          className="w-full rounded-md border border-default-200 bg-background px-3 py-2 text-sm"
          value={seq.showCorrectness ?? "always"}
          onChange={(e) => update((s) => { s.showCorrectness = e.target.value as "always" | "never" | "past_due"; })}
        >
          <option value="always">always — แสดงผลทันทีหลังตอบ</option>
          <option value="never">never — ไม่แสดงผลเลย</option>
          <option value="past_due">past_due — แสดงหลังวัน due เท่านั้น</option>
        </select>
      </div>
    </div>
  );
}
