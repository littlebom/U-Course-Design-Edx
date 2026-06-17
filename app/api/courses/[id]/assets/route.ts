import { NextResponse } from "next/server";
import { prisma, requireUser, isGuardFail, accessCourse, denied } from "@/lib/server/api";

export const runtime = "nodejs";

// GET → all assets as base64 (view access)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessCourse(id, g.user.uid, "view");
  if (!a.ok) return denied(a.status);
  const rows = await prisma.courseAsset.findMany({ where: { courseId: id } });
  return NextResponse.json({
    assets: rows.map((x) => ({ fileName: x.fileName, mime: x.mime, dataB64: Buffer.from(x.bytes).toString("base64") })),
  });
}

// PUT multipart { file, name } → upsert (edit access)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessCourse(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  const form = await req.formData();
  const file = form.get("file");
  const name = String(form.get("name") || (file instanceof File ? file.name : ""));
  if (!(file instanceof File) || !name) return NextResponse.json({ error: "ต้องมี file และ name" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.courseAsset.upsert({
    where: { courseId_fileName: { courseId: id, fileName: name } },
    create: { courseId: id, fileName: name, mime: file.type || "application/octet-stream", bytes },
    update: { mime: file.type || "application/octet-stream", bytes },
  });
  return NextResponse.json({ ok: true });
}

// DELETE ?name=... (edit access)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessCourse(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  const name = new URL(req.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "ต้องระบุ name" }, { status: 400 });
  await prisma.courseAsset.deleteMany({ where: { courseId: id, fileName: name } });
  return NextResponse.json({ ok: true });
}
