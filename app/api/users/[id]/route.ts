import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";

export const runtime = "nodejs";

async function requireAdmin() {
  const me = await getSessionUser();
  if (!me) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (me.role !== "admin") return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { me };
}

// Edit a user: name / username / password / role (admin only)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { me, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: { passwordHash?: string; name?: string; username?: string; role?: string } = {};

  if (typeof body.password === "string" && body.password) data.passwordHash = hashPassword(body.password);
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();

  if (typeof body.username === "string" && body.username.trim()) {
    const username = body.username.trim();
    const clash = await prisma.user.findUnique({ where: { username } });
    if (clash && clash.id !== id) return NextResponse.json({ error: "username นี้มีอยู่แล้ว" }, { status: 409 });
    data.username = username;
  }

  if (body.role === "user" || body.role === "admin") {
    // Prevent locking yourself out of admin
    if (id === me!.uid && body.role !== "admin") {
      return NextResponse.json({ error: "เปลี่ยน role ของตัวเองเป็น user ไม่ได้" }, { status: 400 });
    }
    data.role = body.role;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "ไม่มีข้อมูลให้แก้" }, { status: 400 });
  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { me, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  if (id === me!.uid) return NextResponse.json({ error: "ลบบัญชีตัวเองไม่ได้" }, { status: 400 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
