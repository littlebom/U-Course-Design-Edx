"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, Share2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareRow {
  id: string;
  username: string;
  name: string;
  permission: "view" | "edit";
}

export function ShareDialog({
  resourceType,
  resourceId,
  resourceTitle,
  open,
  onOpenChange,
}: {
  resourceType: "course" | "library";
  resourceId: string;
  resourceTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [username, setUsername] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("edit");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch(`/api/shares?resourceType=${resourceType}&resourceId=${resourceId}`, { credentials: "same-origin" });
    if (res.ok) setShares((await res.json()).shares);
    else if (res.status === 403) setErr("เฉพาะเจ้าของเท่านั้นที่แชร์ได้");
    else setErr("โหลดรายการแชร์ไม่สำเร็จ");
  }, [resourceType, resourceId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) void load();
  }, [open, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ resourceType, resourceId, username: username.trim(), permission }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "แชร์ไม่สำเร็จ");
        return;
      }
      setUsername("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/shares/${id}`, { method: "DELETE", credentials: "same-origin" });
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={18} /> แชร์ &ldquo;{resourceTitle}&rdquo;
          </DialogTitle>
          <DialogDescription>เพิ่มผู้ใช้ด้วย username เพื่อให้เข้าถึง/แก้ไขร่วมกัน</DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-default-600">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="เช่น teacher1" />
          </div>
          <select
            className="h-9 rounded-md border border-default bg-transparent px-2 text-sm"
            value={permission}
            onChange={(e) => setPermission(e.target.value as "view" | "edit")}
          >
            <option value="edit">แก้ไขได้</option>
            <option value="view">ดูอย่างเดียว</option>
          </select>
          <Button type="submit" color="primary" size="sm" disabled={busy || !username.trim()}>
            <UserPlus size={14} className="me-1" /> แชร์
          </Button>
        </form>

        {err && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">{err}</div>
        )}

        <div className="max-h-60 overflow-auto">
          {shares.length === 0 ? (
            <div className="py-3 text-center text-xs text-default-400">ยังไม่ได้แชร์กับใคร</div>
          ) : (
            <ul className="divide-y divide-default-100">
              {shares.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium text-default-700">{s.username}</span>
                    {s.name && <span className="text-default-400"> — {s.name}</span>}
                    <span className="ms-2 rounded bg-default-100 px-1.5 py-0.5 text-2xs text-default-500">
                      {s.permission === "edit" ? "แก้ไขได้" : "ดูอย่างเดียว"}
                    </span>
                  </span>
                  <Button variant="ghost" size="sm" color="destructive" className="!h-7 !px-2" onClick={() => remove(s.id)} title="ยกเลิกแชร์">
                    <Trash2 size={13} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
