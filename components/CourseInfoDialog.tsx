"use client";

import { Info, Globe } from "lucide-react";
import type { Course } from "@/lib/schema";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  course: Course;
  onChange: (next: Course) => void;
  onClose: () => void;
};

export function CourseInfoDialog({ open, course, onChange, onClose }: Props) {
  const setMeta = <K extends keyof Course["course"]>(key: K, val: Course["course"][K]) =>
    onChange({ ...course, course: { ...course.course, [key]: val } });
  const setAbout = <K extends keyof Course["about"]>(key: K, val: Course["about"][K]) =>
    onChange({ ...course, about: { ...course.about, [key]: val } });

  const a = course.about;
  const ytId = parseYoutubeId(a.introVideoYoutubeId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" className="!max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info size={18} /> Course Overview & Info
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <Section title="ข้อมูลพื้นฐาน" icon={<Globe size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subtitle (คำขวัญสั้น ๆ)">
                <Input value={a.subtitle} onChange={(e) => setAbout("subtitle", e.target.value)} />
              </Field>
              <Field label="Effort (ความพยายามที่ต้องใช้)">
                <Input
                  value={a.effort}
                  onChange={(e) => setAbout("effort", e.target.value)}
                  placeholder="เช่น 2 ชั่วโมง/สัปดาห์"
                />
              </Field>
              <Field label="Duration (ระยะเวลาทั้งหมด)">
                <Input
                  value={a.duration}
                  onChange={(e) => setAbout("duration", e.target.value)}
                  placeholder="เช่น 5 ชั่วโมง"
                />
              </Field>
              <Field label="Language">
                <Input
                  value={course.course.language}
                  onChange={(e) => setMeta("language", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="คำอธิบายสั้น (Short Description)">
            <Textarea
              rows={3}
              value={a.shortDescription}
              onChange={(e) => setAbout("shortDescription", e.target.value)}
              placeholder="ใช้แสดงใน catalog / card ของคอร์ส"
            />
          </Section>

          <Section title="Course Overview (HTML)">
            <Textarea
              rows={10}
              className="!font-mono !text-xs"
              value={a.overview}
              onChange={(e) => setAbout("overview", e.target.value)}
              placeholder='<section class="about"><h2>เกี่ยวกับรายวิชา</h2><p>...</p></section>'
            />
            <p className="mt-1 text-xs text-muted-foreground">
              เนื้อหาที่จะแสดงในหน้า landing page ของคอร์สบน Open edX
            </p>
          </Section>

          <Section title="Intro Video (YouTube)">
            <div className="space-y-2">
              <Input
                value={a.introVideoYoutubeId}
                onChange={(e) => setAbout("introVideoYoutubeId", parseYoutubeId(e.target.value))}
                placeholder="dQw4w9WgXcQ หรือ URL เต็ม"
              />
              {ytId && (
                <div className="aspect-video w-full overflow-hidden rounded-md border border-default-200 bg-default-100">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    className="h-full w-full"
                    title="Intro preview"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button color="primary" size="sm" onClick={onClose}>
            เสร็จสิ้น
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-default-500">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function parseYoutubeId(input: string): string {
  const trimmed = input.trim();
  const m =
    trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : trimmed;
}
