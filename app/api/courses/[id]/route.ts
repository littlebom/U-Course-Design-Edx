import { NextResponse } from "next/server";
import { courseSchema } from "@/lib/schema";
import { prisma, requireUser, isGuardFail, courseName, toCourseRecord, accessCourse, denied } from "@/lib/server/api";

export const runtime = "nodejs";

// GET /api/courses/[id]  (view access)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessCourse(id, g.user.uid, "view");
  if (!a.ok) return denied(a.status);
  return NextResponse.json(toCourseRecord(a.row));
}

// PUT /api/courses/[id] { course }  (edit access)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessCourse(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  const body = await req.json().catch(() => ({}));
  const parsed = courseSchema.safeParse(body?.course);
  if (!parsed.success) {
    return NextResponse.json({ error: "course ไม่ถูกต้อง", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  await prisma.course.update({ where: { id }, data: { data: parsed.data, name: courseName(parsed.data) } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/courses/[id] { action: "rename"|"softDelete"|"restore", name? }  (owner only)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessCourse(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  if (a.role !== "owner") return denied(403);
  const body = await req.json().catch(() => ({}));
  if (body.action === "rename" && typeof body.name === "string" && body.name.trim()) {
    await prisma.course.update({ where: { id }, data: { name: body.name.trim() } });
  } else if (body.action === "softDelete") {
    await prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
  } else if (body.action === "restore") {
    await prisma.course.update({ where: { id }, data: { deletedAt: null } });
  } else {
    return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/courses/[id]  (owner only; assets cascade)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessCourse(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  if (a.role !== "owner") return denied(403);
  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
