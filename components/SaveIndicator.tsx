"use client";

import { Check, CircleDashed, AlertCircle } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status, savedAt }: { status: SaveStatus; savedAt: number | null }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-2xs text-default-400">
        <CircleDashed size={11} className="animate-spin" /> กำลังบันทึก…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-2xs text-destructive">
        <AlertCircle size={11} /> บันทึกล้มเหลว
      </span>
    );
  }
  if (status === "saved" && savedAt) {
    return (
      <span className="flex items-center gap-1 text-2xs text-default-400">
        <Check size={11} /> บันทึกแล้ว {formatRelative(savedAt)}
      </span>
    );
  }
  return null;
}

function formatRelative(t: number): string {
  const dt = Math.max(0, Date.now() - t);
  if (dt < 5_000) return "เมื่อกี้นี้";
  if (dt < 60_000) return `${Math.floor(dt / 1000)} วินาทีก่อน`;
  if (dt < 3_600_000) return `${Math.floor(dt / 60_000)} นาทีก่อน`;
  return new Date(t).toLocaleTimeString("th-TH");
}
