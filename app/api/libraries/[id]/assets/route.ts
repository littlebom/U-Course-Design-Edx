import { NextResponse } from "next/server";
import { prisma, requireUser, isGuardFail, accessLibrary, denied } from "@/lib/server/api";

export const runtime = "nodejs";

// GET → all library assets as base64 (view access)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessLibrary(id, g.user.uid, "view");
  if (!a.ok) return denied(a.status);
  const rows = await prisma.libraryAsset.findMany({ where: { libraryId: id } });
  return NextResponse.json({
    assets: rows.map((x) => ({ assetKey: x.assetKey, mime: x.mime, dataB64: Buffer.from(x.bytes).toString("base64") })),
  });
}

// PUT multipart { file, key } → upsert (edit access)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessLibrary(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  const form = await req.formData();
  const file = form.get("file");
  const key = String(form.get("key") || "");
  if (!(file instanceof File) || !key) return NextResponse.json({ error: "ต้องมี file และ key" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.libraryAsset.upsert({
    where: { libraryId_assetKey: { libraryId: id, assetKey: key } },
    create: { libraryId: id, assetKey: key, mime: file.type || "application/octet-stream", bytes },
    update: { mime: file.type || "application/octet-stream", bytes },
  });
  return NextResponse.json({ ok: true });
}

// DELETE ?key=... (edit access)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessLibrary(id, g.user.uid, "edit");
  if (!a.ok) return denied(a.status);
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "ต้องระบุ key" }, { status: 400 });
  await prisma.libraryAsset.deleteMany({ where: { libraryId: id, assetKey: key } });
  return NextResponse.json({ ok: true });
}
