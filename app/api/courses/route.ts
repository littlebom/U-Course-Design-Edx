import { NextResponse } from "next/server";
import { courseSchema } from "@/lib/schema";
import { prisma, requireUser, isGuardFail, courseName, toCourseRecord } from "@/lib/server/api";

export const runtime = "nodejs";

// GET /api/courses?includeDeleted=1  → owned + shared-with-me (newest first)
export async function GET(req: Request) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "1";

  const owned = await prisma.course.findMany({
    where: { ownerId: g.user.uid, ...(includeDeleted ? {} : { deletedAt: null }) },
    orderBy: { updatedAt: "desc" },
  });

  const shares = await prisma.share.findMany({
    where: { resourceType: "course", sharedWithUserId: g.user.uid },
  });
  let sharedRecords: ReturnType<typeof toCourseRecord>[] = [];
  if (shares.length) {
    const rows = await prisma.course.findMany({ where: { id: { in: shares.map((s) => s.resourceId) }, deletedAt: null } });
    const permById = new Map(shares.map((s) => [s.resourceId, s.permission]));
    const owners = await prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.ownerId) } },
      select: { id: true, name: true, username: true },
    });
    const ownerById = new Map(owners.map((o) => [o.id, o]));
    sharedRecords = rows.map((r) => ({
      ...toCourseRecord(r),
      shared: { permission: permById.get(r.id), ownerName: ownerById.get(r.ownerId)?.name || ownerById.get(r.ownerId)?.username || "" },
    }));
  }

  return NextResponse.json({ records: [...owned.map(toCourseRecord), ...sharedRecords] });
}

// POST /api/courses { course, name? }  → create
export async function POST(req: Request) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const body = await req.json().catch(() => ({}));
  const parsed = courseSchema.safeParse(body?.course);
  if (!parsed.success) {
    return NextResponse.json({ error: "course ไม่ถูกต้อง", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const course = parsed.data;
  const row = await prisma.course.create({
    data: {
      ownerId: g.user.uid,
      name: (typeof body.name === "string" && body.name.trim()) || courseName(course),
      data: course,
    },
  });
  return NextResponse.json(toCourseRecord(row), { status: 201 });
}
