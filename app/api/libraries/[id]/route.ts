import { NextResponse } from "next/server";
import { librarySchema } from "@/lib/library/schema";
import { prisma, requireUser, isGuardFail, libraryName, toLibraryRecord, accessLibrary, denied } from "@/lib/server/api";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessLibrary(id, g.user.uid, "view");
  if (!a.ok) return denied(a.status);
  return NextResponse.json(toLibraryRecord(a.row));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessLibrary(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  const body = await req.json().catch(() => ({}));
  const parsed = librarySchema.safeParse(body?.library);
  if (!parsed.success) {
    return NextResponse.json({ error: "library ไม่ถูกต้อง", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  await prisma.library.update({ where: { id }, data: { data: parsed.data, name: libraryName(parsed.data) } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessLibrary(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  if (a.role !== "owner") return denied(403);
  const body = await req.json().catch(() => ({}));
  if (body.action === "softDelete") {
    await prisma.library.update({ where: { id }, data: { deletedAt: new Date() } });
  } else if (body.action === "restore") {
    await prisma.library.update({ where: { id }, data: { deletedAt: null } });
  } else {
    return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessLibrary(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  if (a.role !== "owner") return denied(403);
  await prisma.library.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
