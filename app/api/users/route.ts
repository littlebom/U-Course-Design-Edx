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

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "admin" ? "admin" : "user";
  if (!username || !password) {
    return NextResponse.json({ error: "ต้องมี username และ password" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ error: "username นี้มีอยู่แล้ว" }, { status: 409 });
  const user = await prisma.user.create({
    data: { username, name: name || username, role, passwordHash: hashPassword(password) },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user }, { status: 201 });
}
