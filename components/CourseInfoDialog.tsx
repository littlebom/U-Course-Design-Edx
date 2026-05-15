"use client";

import { Info, Globe, ImagePlus, X, Tag } from "lucide-react";
import type { Course } from "@/lib/schema";
import type { AssetFile } from "@/components/AssetUploader";
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
  assets: Map<string, AssetFile>;
  onAssetsChange: (next: Map<string, AssetFile>) => void;
};

export function CourseInfoDialog({ open, course, onChange, onClose, assets, onAssetsChange }: Props) {
  const setMeta = <K extends keyof Course["course"]>(key: K, val: Course["course"][K]) =>
    onChange({ ...course, course: { ...course.course, [key]: val } });
  const setAbout = <K extends keyof Course["about"]>(key: K, val: Course["about"][K]) =>
    onChange({ ...course, about: { ...course.about, [key]: val } });

  const a = course.about;
  const ytId = parseYoutubeId(a.introVideoYoutubeId);

  const isAssetUrl = (s: string) => s.startsWith("/asset-v1:") || s.startsWith("asset-v1:");
  const courseImageAsset = a.courseImageName && !isAssetUrl(a.courseImageName)
    ? assets.get(a.courseImageName)
    : null;
  const courseImagePreview = isAssetUrl(a.courseImageName)
    ? a.courseImageName
    : courseImageAsset
      ? URL.createObjectURL(courseImageAsset.blob)
      : null;

  const handleImageUpload = (file: File) => {
    const next = new Map(assets);
    next.set(file.name, { name: file.name, blob: file, size: file.size });
    onAssetsChange(next);
    setAbout("courseImageName", file.name);
  };

  const handleImageRemove = () => {
    setAbout("courseImageName", "");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" className="!max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info size={18} /> Course Overview & Info
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <Section title="ระบุตัวตนคอร์ส (Course Identity)" icon={<Tag size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ชื่อคอร์ส (Display Name)">
                <Input
                  value={course.course.displayName}
                  onChange={(e) => setMeta("displayName", e.target.value)}
                  placeholder="ชื่อที่แสดงใน Open edX"
                />
              </Field>
              <Field label="Organization (org)">
                <Input
                  value={course.course.org}
                  onChange={(e) => setMeta("org", e.target.value)}
                  placeholder="เช่น ThaiMOOC"
                  className="!font-mono"
                />
              </Field>
              <Field label="Course Code">
                <Input
                  value={course.course.courseCode}
                  onChange={(e) => setMeta("courseCode", e.target.value)}
                  placeholder="เช่น CS101"
                  className="!font-mono"
                />
              </Field>
              <Field label="Run">
                <Input
                  value={course.course.run}
                  onChange={(e) => setMeta("run", e.target.value)}
                  placeholder="เช่น 2026_T1"
                  className="!font-mono"
                />
              </Field>
              <Field label="วันเปิดคอร์ส (Start)">
                <Input
                  type="datetime-local"
                  value={course.course.start.replace("Z", "")}
                  onChange={(e) => setMeta("start", e.target.value ? e.target.value + "Z" : "2026-01-01T00:00:00Z")}
                />
              </Field>
              <Field label="วันปิดคอร์ส (End)">
                <Input
                  type="datetime-local"
                  value={(course.course.end ?? "").replace("Z", "")}
                  onChange={(e) => setMeta("end", e.target.value ? e.target.value + "Z" : undefined)}
                />
              </Field>
              <Field label="เปิดรับสมัคร (Enrollment Start)">
                <Input
                  type="datetime-local"
                  value={(course.course.enrollmentStart ?? "").replace("Z", "")}
                  onChange={(e) => setMeta("enrollmentStart", e.target.value ? e.target.value + "Z" : undefined)}
                />
              </Field>
              <Field label="ปิดรับสมัคร (Enrollment End)">
                <Input
                  type="datetime-local"
                  value={(course.course.enrollmentEnd ?? "").replace("Z", "")}
                  onChange={(e) => setMeta("enrollmentEnd", e.target.value ? e.target.value + "Z" : undefined)}
                />
              </Field>
              <Field label="รูปแบบการเรียน">
                <div className="flex items-center gap-2 pt-1.5">
                  <input
                    type="checkbox"
                    id="self-paced"
                    checked={course.course.selfPaced}
                    onChange={(e) => setMeta("selfPaced", e.target.checked)}
                  />
                  <label htmlFor="self-paced" className="text-sm">Self-paced (เรียนตามอัธยาศัย)</label>
                </div>
              </Field>
              <Field label="การมองเห็นใน Catalog">
                <select
                  className="w-full rounded-md border border-default-200 bg-background px-3 py-2 text-sm"
                  value={course.course.catalogVisibility}
                  onChange={(e) => setMeta("catalogVisibility", e.target.value as "both" | "about" | "none")}
                >
                  <option value="both">both — แสดงทั้งใน catalog และหน้า about</option>
                  <option value="about">about — แสดงเฉพาะหน้า about</option>
                  <option value="none">none — ซ่อนทั้งหมด</option>
                </select>
              </Field>
              <Field label="การลงทะเบียน">
                <div className="flex items-center gap-2 pt-1.5">
                  <input
                    type="checkbox"
                    id="invitation-only"
                    checked={course.course.invitationOnly}
                    onChange={(e) => setMeta("invitationOnly", e.target.checked)}
                  />
                  <label htmlFor="invitation-only" className="text-sm">Invitation only (ต้องได้รับเชิญ)</label>
                </div>
              </Field>
            </div>
          </Section>

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
              className="!font-mono !text-base"
              value={a.overview}
              onChange={(e) => setAbout("overview", e.target.value)}
              placeholder='<section class="about"><h2>เกี่ยวกับรายวิชา</h2><p>...</p></section>'
            />
            <p className="mt-1 text-xs text-muted-foreground">
              เนื้อหาที่จะแสดงในหน้า landing page ของคอร์สบน Open edX
            </p>
          </Section>

          <Section title="Course Card Image (รูปภาพประจำคอร์ส)" icon={<ImagePlus size={14} />}>
            <div className="space-y-3">
              {/* Preview */}
              {courseImagePreview && (
                <div className="relative mx-auto w-1/2 overflow-hidden rounded-md border border-default-200 bg-default-100">
                  <img
                    src={courseImagePreview}
                    alt="course card"
                    className="aspect-video w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-destructive hover:bg-background"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Upload file */}
              {!courseImagePreview && (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-default-200 bg-default-50 py-5 text-sm text-default-400 hover:border-primary hover:text-primary transition-colors">
                  <ImagePlus size={22} />
                  <span>คลิกเพื่อเลือกไฟล์รูปภาพ (JPG, PNG, WebP)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                </label>
              )}

              {/* Asset URL input */}
              <Field label="หรือวาง Open edX Asset URL">
                <Input
                  value={isAssetUrl(a.courseImageName) ? a.courseImageName : ""}
                  onChange={(e) => setAbout("courseImageName", e.target.value.trim())}
                  placeholder="/asset-v1:ORG+COURSE+RUN+type@asset+block@image.jpg"
                  className="!font-mono !text-xs"
                />
              </Field>

              <p className="text-xs text-muted-foreground">
                แนะนำขนาด 378×225 px (ratio 16:9) — จะ export เป็น <code>course_image</code> ใน OLX
              </p>
            </div>
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
