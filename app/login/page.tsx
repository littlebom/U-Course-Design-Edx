"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Library as LibIcon, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/courses";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      router.replace(from.startsWith("/login") ? "/courses" : from);
      router.refresh();
    } catch {
      setErr("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-default-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-2 border-b py-5">
          <LibIcon size={28} className="text-primary" />
          <CardTitle className="text-lg">U-CourseBuilder</CardTitle>
          <p className="text-xs text-default-400">เข้าสู่ระบบเพื่อใช้งาน</p>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-default-600">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-default-600">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {err && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">
                {err}
              </div>
            )}
            <Button type="submit" color="primary" fullWidth disabled={busy || !username || !password}>
              <LogIn size={15} className="me-1.5" /> {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center text-default-400">กำลังโหลด…</div>}>
      <LoginForm />
    </Suspense>
  );
}
