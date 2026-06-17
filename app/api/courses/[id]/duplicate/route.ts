import { NextResponse } from "next/server";
import type { Course } from "@/lib/schema";
import { prisma, requireUser, isGuardFail, courseName, toCourseRecord, accessCourse, denied } from "@/lib/server/api";

export const runtime = "nodejs";

// POST /api/courses/[id]/duplicate  → clone course + its assets (view access; copy is owned by you)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const a = await accessCourse(id, g.user.uid, "view");
  if (!a.ok) return denied(a.status);
  const src = a.row;

  const clone = structuredClone(src.data) as Course;
  clone.course.run = `${clone.course.run}-copy`;

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.course.create({
      data: { ownerId: g.user.uid, name: `${courseName(clone)}`, data: clone },
    });
    const assets = await tx.courseAsset.findMany({ where: { courseId: src.id } });
    if (assets.length) {
      await tx.courseAsset.createMany({
        data: assets.map((a) => ({ courseId: row.id, fileName: a.fileName, mime: a.mime, bytes: a.bytes })),
      });
    }
    return row;
  });
  return NextResponse.json(toCourseRecord(created), { status: 201 });
}
