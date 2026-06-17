"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, Pencil, ShieldCheck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface U {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

export function UsersAdmin({ meId, meName }: { meId: string; meName: string }) {
  const [users, setUsers] = useState<U[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "user" });
  const [busy, setBusy] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState<U | null>(null);
  const [editForm, setEditForm] = useState({ name: "", username: "", role: "user", password: "" });
  const [editErr, setEditErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers((await res.json()).users);
    else setErr("โหลดรายชื่อไม่สำเร็จ");
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "เพิ่มผู้ใช้ไม่สำเร็จ");
        return;
      }
      setForm({ username: "", name: "", password: "", role: "user" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const del = async (u: U) => {
    if (!confirm(`ลบผู้ใช้ "${u.username}"?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) await load();
    else setErr((await res.json().catch(() => ({})))?.error || "ลบไม่สำเร็จ");
  };

  const openEdit = (u: U) => {
    setEditErr(null);
    setEditForm({ name: u.name, username: u.username, role: u.role, password: "" });
    setEditing(u);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditErr(null);
    setBusy(true);
    try {
      const body: Record<string, string> = {
        name: editForm.name,
        username: editForm.username,
        role: editForm.role,
      };
      if (editForm.password) body.password = editForm.password;
      const res = await fetch(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditErr(data?.error || "บันทึกไม่สำเร็จ");
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="text-lg font-semibold text-default-800">จัดการผู้ใช้</h1>
        <span className="text-sm text-default-500">เข้าใช้เป็น {meName}</span>
      </div>

      {err && (
        <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">
          {err}
        </div>
      )}

      <Card className="mb-4">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm">เพิ่มผู้ใช้ใหม่</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={add} className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:items-end">
            <Input placeholder="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input placeholder="ชื่อแสดง" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select
              className="h-9 rounded-md border border-default bg-transparent px-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <Button type="submit" color="primary" size="sm" disabled={busy || !form.username || !form.password}>
              <UserPlus size={14} className="me-1" /> เพิ่ม
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm">ผู้ใช้ทั้งหมด ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ul className="divide-y divide-default-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-2 py-2 text-sm">
                <span className="flex items-center gap-2">
                  {u.role === "admin" ? <ShieldCheck size={14} className="text-primary" /> : <UserIcon size={14} className="text-default-400" />}
                  <span className="font-medium text-default-700">{u.username}</span>
                  <span className="text-default-400">— {u.name}</span>
                  {u.id === meId && <span className="text-xs text-default-400">(คุณ)</span>}
                </span>
                <span className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="!h-7 !px-2" title="แก้ไข" onClick={() => openEdit(u)}>
                    <Pencil size={13} />
                  </Button>
                  {u.id !== meId && (
                    <Button variant="ghost" size="sm" color="destructive" className="!h-7 !px-2" title="ลบ" onClick={() => del(u)}>
                      <Trash2 size={13} />
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขผู้ใช้</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-default-600">ชื่อแสดง</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-default-600">Username</label>
              <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-default-600">Role</label>
              <select
                className="h-9 w-full rounded-md border border-default bg-transparent px-2 text-sm disabled:opacity-50"
                value={editForm.role}
                disabled={editing?.id === meId}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              {editing?.id === meId && <p className="mt-1 text-xs text-default-400">เปลี่ยน role ของตัวเองไม่ได้</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-default-600">รหัสผ่านใหม่</label>
              <Input
                type="text"
                value={editForm.password}
                placeholder="เว้นว่าง = ไม่เปลี่ยนรหัสผ่าน"
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              />
            </div>
            {editErr && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">{editErr}</div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                ยกเลิก
              </Button>
              <Button type="submit" color="primary" disabled={busy || !editForm.username.trim() || !editForm.name.trim()}>
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
