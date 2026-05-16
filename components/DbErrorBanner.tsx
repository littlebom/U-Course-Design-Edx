"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEntireDb } from "@/lib/db";

export function DbErrorBanner({ error }: { error: string }) {
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!confirm("ลบฐานข้อมูลทั้งหมด? courses + libraries ทุกรายการจะหายไป\n\nแนะนำกด Backup ใน /courses ก่อนถ้ามีข้อมูลสำคัญ")) return;
    setResetting(true);
    try {
      await deleteEntireDb();
      window.location.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(
        `Reset ล้มเหลว: ${msg}\n\n` +
        `ทางออก: ปิดทุก tab/window ของแอปนี้ก่อน แล้วลองอีกครั้ง\n` +
        `หรือเปิด DevTools → Application → IndexedDB → คลิกขวาที่ "olx-builder" → Delete database`,
      );
      setResetting(false);
    }
  };

  return (
    <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive" />
        <div className="flex-1 space-y-2">
          <p className="font-medium text-destructive">เปิดฐานข้อมูลไม่สำเร็จ</p>
          <p className="text-xs text-default-600">{error}</p>
          <div className="space-y-1.5 text-xs text-default-600">
            <p className="font-medium">วิธีแก้ตามลำดับ:</p>
            <ol className="ml-4 list-decimal space-y-0.5">
              <li>ปิด tab/window อื่นของแอปนี้ทั้งหมด (รวม Electron app ถ้ามี) แล้วกด Reload</li>
              <li>ยังไม่หาย? กด &quot;รีเซ็ตฐานข้อมูล&quot; (ลบทั้งหมด)</li>
              <li>Reset ก็ยังไม่ได้? เปิด DevTools (F12) → Application → IndexedDB → คลิกขวาที่ <code className="rounded bg-default-100 px-1">olx-builder</code> → Delete database</li>
            </ol>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw size={12} className="me-1" /> Reload
            </Button>
            <Button
              size="sm"
              color="destructive"
              variant="outline"
              onClick={handleReset}
              disabled={resetting}
            >
              <Trash2 size={12} className="me-1" />
              {resetting ? "กำลังลบ…" : "รีเซ็ตฐานข้อมูล"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
