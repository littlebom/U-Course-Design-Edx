import { NextResponse } from "next/server";
import { prisma, requireUser, isGuardFail } from "@/lib/server/api";

export const runtime = "nodejs";

// POST /api/courses/purge-trash?days=7  → hard-delete own trashed courses older than N days
export async function POST(req: Request) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const days = Number(new URL(req.url).searchParams.get("days") ?? "7") || 7;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const res = await prisma.course.deleteMany({
    where: { ownerId: g.user.uid, deletedAt: { not: null, lt: cutoff } },
  });
  return NextResponse.json({ purged: res.count });
}
