import { NextResponse } from "next/server";
import { librarySchema } from "@/lib/library/schema";
import { prisma, requireUser, isGuardFail, libraryName, toLibraryRecord } from "@/lib/server/api";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "1";

  const owned = await prisma.library.findMany({
    where: { ownerId: g.user.uid, ...(includeDeleted ? {} : { deletedAt: null }) },
    orderBy: { updatedAt: "desc" },
  });

  const shares = await prisma.share.findMany({
    where: { resourceType: "library", sharedWithUserId: g.user.uid },
  });
  let sharedRecords: ReturnType<typeof toLibraryRecord>[] = [];
  if (shares.length) {
    const rows = await prisma.library.findMany({ where: { id: { in: shares.map((s) => s.resourceId) }, deletedAt: null } });
    const permById = new Map(shares.map((s) => [s.resourceId, s.permission]));
    const owners = await prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.ownerId) } },
      select: { id: true, name: true, username: true },
    });
    const ownerById = new Map(owners.map((o) => [o.id, o]));
    sharedRecords = rows.map((r) => ({
      ...toLibraryRecord(r),
      shared: { permission: permById.get(r.id), ownerName: ownerById.get(r.ownerId)?.name || ownerById.get(r.ownerId)?.username || "" },
    }));
  }

  return NextResponse.json({ records: [...owned.map(toLibraryRecord), ...sharedRecords] });
}

export async function POST(req: Request) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const body = await req.json().catch(() => ({}));
  const parsed = librarySchema.safeParse(body?.library);
  if (!parsed.success) {
    return NextResponse.json({ error: "library ไม่ถูกต้อง", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const library = parsed.data;
  const row = await prisma.library.create({
    data: {
      ownerId: g.user.uid,
      name: (typeof body.name === "string" && body.name.trim()) || libraryName(library),
      data: library,
    },
  });
  return NextResponse.json(toLibraryRecord(row), { status: 201 });
}
