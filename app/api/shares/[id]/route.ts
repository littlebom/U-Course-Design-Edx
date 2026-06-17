import { NextResponse } from "next/server";
import { prisma, requireUser, isGuardFail } from "@/lib/server/api";

export const runtime = "nodejs";

// DELETE /api/shares/[id]  (owner of the share row only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const { id } = await params;
  const share = await prisma.share.findUnique({ where: { id } });
  if (!share) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (share.ownerId !== g.user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.share.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
