"use client";

import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEntireDb } from "@/lib/db";

export function DbErrorBanner({ error }: { error: string }) {
  const looksLikeTimeout = /timed out|blocked/i.test(error);
  return (
    <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive" />
        <div className="flex-1 space-y-2">
          <p className="font-medium text-destructive">เปิดฐานข้อมูลไม่สำเร็จ</p>
          <p className="text-xs text-default-600">{error}</p>
          {looksLikeTimeout && (
            <div className="space-y-1.5 text-xs text-default-600">
              <p className="font-medium">วิธีแก้ตามลำดับ:</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                <li>ปิด tab อื่นของแอปนี้ทั้งหมด แล้วกด Reload</li>
                <li>ถ้ายังไม่หาย กดปุ่ม &quot;รีเซ็ตฐานข้อมูล&quot; ด้านล่าง (จะลบ courses/libraries ทั้งหมด)</li>
              </ol>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw size={12} className="me-1" /> Reload
            </Button>
            {looksLikeTimeout && (
              <Button
                size="sm"
                color="destructive"
                variant="outline"
                onClick={async () => {
                  if (!confirm("ลบฐานข้อมูลทั้งหมด? ทั้ง courses และ libraries จะหายไป — แนะนำ Backup ก่อน")) return;
                  try {
                    await deleteEntireDb();
                    window.location.reload();
                  } catch (e) {
                    alert(`Reset ล้มเหลว: ${e instanceof Error ? e.message : String(e)}\n\nลองปิดทุก tab ของแอปก่อน`);
                  }
                }}
              >
                <Trash2 size={12} className="me-1" /> รีเซ็ตฐานข้อมูล
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
